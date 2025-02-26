import { ref, reactive, computed } from 'vue';
import * as Vue from 'vue';
import { NoteNode } from 'src/models/NoteNode';
import { ExtensionNodeDefinition, ExtensionNodeComponent, ExtensionRegistry } from 'src/models/ExtensionNode';

// 확장 노드 등록 정보
const extensionRegistry = reactive<ExtensionRegistry>({});

// 확장 노드 컴포넌트 맵
const extensionComponents = reactive<Record<string, ExtensionNodeComponent>>({});

// 확장 노드 상태 관리
const isLoading = ref(false);
const lastError = ref<string | null>(null);

// 외부 확장 노드 디렉토리 경로
const EXTERNAL_EXTENSIONS_DIR = '/external_extension_nodes/';

// 확장 노드 관리자
export const useExtensionManager = () => {
  // 등록된 모든 확장 노드 목록
  const allExtensions = computed(() => {
    return Object.values(extensionRegistry);
  });

  // 내부 확장 노드 목록
  const internalExtensions = computed(() => {
    return allExtensions.value.filter(ext => !ext.isExternal);
  });

  // 외부 확장 노드 목록
  const externalExtensions = computed(() => {
    return allExtensions.value.filter(ext => ext.isExternal);
  });

  // 확장 노드 등록
  function registerExtension(extension: ExtensionNodeDefinition, component: ExtensionNodeComponent) {
    if (extensionRegistry[extension.type]) {
      console.warn(`확장 노드 타입 '${extension.type}'이(가) 이미 등록되어 있습니다.`);
      return false;
    }

    // 확장 노드 정의 등록
    extensionRegistry[extension.type] = extension;

    // 확장 노드 컴포넌트 등록
    extensionComponents[extension.type] = component;

    console.log(`확장 노드 '${extension.name}' 등록됨 (타입: ${extension.type})`);

    // 이벤트 발생 - 확장 노드 등록됨 (Vue 외부에서도 감지 가능하도록)
    window.dispatchEvent(new CustomEvent('extension-registered', {
      detail: { extension }
    }));

    return true;
  }

  // 확장 노드 등록 해제
  function unregisterExtension(type: string) {
    if (!extensionRegistry[type]) {
      console.warn(`확장 노드 타입 '${type}'이(가) 등록되어 있지 않습니다.`);
      return false;
    }

    const extension = extensionRegistry[type];

    // 확장 노드 정의 제거
    delete extensionRegistry[type];

    // 확장 노드 컴포넌트 제거
    delete extensionComponents[type];

    console.log(`확장 노드 타입 '${type}' 등록 해제됨`);

    // 이벤트 발생 - 확장 노드 등록 해제됨
    window.dispatchEvent(new CustomEvent('extension-unregistered', {
      detail: { type, extension }
    }));

    return true;
  }

  // 확장 노드 컴포넌트 조회
  function getExtensionComponent(type: string): ExtensionNodeComponent | null {
    return extensionComponents[type] || null;
  }

  // 확장 노드 정의 조회
  function getExtensionDefinition(type: string): ExtensionNodeDefinition | null {
    return extensionRegistry[type] || null;
  }

  // 확장 노드 초기화 (새 노드 생성 시)
  function initializeExtensionNode(node: NoteNode): NoteNode {
    const extensionComponent = getExtensionComponent(node.type);
    if (extensionComponent) {
      return extensionComponent.initialize(node);
    }
    return node;
  }

  // 내부 확장 모듈 자동 로드
  async function loadInternalExtensions() {
    try {
      isLoading.value = true;
      lastError.value = null;

      // 내부 확장 노드 디렉토리에서 모든 확장 노드 로드
      const modules = import.meta.glob('/src/components/extension_nodes/*.vue');

      for (const path in modules) {
        const moduleLoader = modules[path];
        if (moduleLoader) {
          const module = await moduleLoader();
          // TypeScript 타입 단언을 사용하여 모듈 타입 지정
          const component = (module as any).default;

          // 확장 노드 컴포넌트가 제대로 구현되었는지 확인
          if (component && component.extensionDefinition && component.initialize) {
            registerExtension(
              component.extensionDefinition,
              {
                name: component.name,
                nodeType: component.extensionDefinition.type,
                initialize: component.initialize,
                component: component
              }
            );
          } else {
            console.warn(`확장 노드 컴포넌트가 올바르게 구현되지 않았습니다: ${path}`);
          }
        }
      }

      console.log(`${Object.keys(extensionRegistry).length}개의 내부 확장 노드가 로드되었습니다.`);
      return true;
    } catch (error) {
      console.error('내부 확장 노드 로드 중 오류 발생:', error);
      lastError.value = `내부 확장 노드 로드 중 오류: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 외부 확장 모듈 로드 (URL 또는 파일 경로)
  async function loadExternalExtension(source: string): Promise<boolean> {
    try {
      isLoading.value = true;
      lastError.value = null;

      let moduleCode: string;

      // URL인지 로컬 파일 경로인지 확인
      if (source.startsWith('http://') || source.startsWith('https://')) {
        // 원격 URL에서 로드
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`확장 모듈을 불러올 수 없습니다: ${response.statusText}`);
        }
        moduleCode = await response.text();
      } else {
        // 로컬 파일 경로에서 로드 (external_extension_nodes 디렉토리)
        // 경로가 '/'로 시작하지 않으면 기본 디렉토리 추가
        const fullPath = source.startsWith('/')
          ? source
          : EXTERNAL_EXTENSIONS_DIR + source;

        const response = await fetch(fullPath);
        if (!response.ok) {
          throw new Error(`로컬 확장 모듈을 불러올 수 없습니다: ${response.statusText}`);
        }
        moduleCode = await response.text();
      }

      // 모듈 코드 실행
      const moduleFunction = new Function('Vue', 'ExtensionManager', moduleCode);

      // 확장 모듈 초기화 (Vue 인스턴스와 ExtensionManager 전달)
      moduleFunction(Vue, {
        registerExtension: (def: ExtensionNodeDefinition, comp: ExtensionNodeComponent) => {
          // 외부에서 불러온 확장으로 표시
          def.isExternal = true;
          // 소스 정보 저장
          def.metadata = {
            ...def.metadata,
            source
          };
          return registerExtension(def, comp);
        }
      });

      console.log(`외부 확장 노드가 성공적으로 로드되었습니다: ${source}`);

      // 확장 정보 저장
      saveExternalExtension(source);

      return true;
    } catch (error) {
      console.error('외부 확장 노드 로드 중 오류 발생:', error);
      lastError.value = `외부 확장 노드 로드 중 오류: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 외부 확장 노드 소스 저장
  function saveExternalExtension(source: string) {
    // 로컬 스토리지에서 기존 외부 확장 노드 URL 목록 가져오기
    const savedSources = localStorage.getItem('external_extensions');
    const sourceList: string[] = savedSources ? JSON.parse(savedSources) : [];

    // 이미 목록에 있는지 확인
    if (!sourceList.includes(source)) {
      sourceList.push(source);
      localStorage.setItem('external_extensions', JSON.stringify(sourceList));
    }
  }

  // 외부 확장 노드 소스 제거
  function removeExternalExtension(source: string) {
    const savedSources = localStorage.getItem('external_extensions');
    if (savedSources) {
      const sourceList: string[] = JSON.parse(savedSources);
      const newList = sourceList.filter(s => s !== source);
      localStorage.setItem('external_extensions', JSON.stringify(newList));
    }
  }

  // 초기화
  async function initialize() {
    // 내부 확장 노드 로드
    await loadInternalExtensions();

    // 로컬 스토리지에서 저장된 외부 확장 노드 소스 로드
    const savedSources = localStorage.getItem('external_extensions');
    if (savedSources) {
      const sourceList = JSON.parse(savedSources);
      for (const source of sourceList) {
        await loadExternalExtension(source);
      }
    }
  }

  return {
    allExtensions,
    internalExtensions,
    externalExtensions,
    isLoading,
    lastError,
    registerExtension,
    unregisterExtension,
    getExtensionComponent,
    getExtensionDefinition,
    initializeExtensionNode,
    loadInternalExtensions,
    loadExternalExtension,
    saveExternalExtension,
    removeExternalExtension,
    initialize,
    extensionRegistry
  };
};

// 싱글톤 인스턴스로 노출
const extensionManager = useExtensionManager();
export default extensionManager;
