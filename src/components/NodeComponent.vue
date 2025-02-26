<!-- src/components/NodeComponent.vue -->
<template>
  <div
    class="node-wrapper"
    :data-node-id="node.id"
    :class="{
      'is-focused': isFocused,
      'is-empty': !localNode.content && localNode.type !== 'divider'
    }"
    @click="handleNodeClick"
  >
    <!-- 드래그 핸들 -->
    <div class="node-handle" ref="dragHandleRef">
      <q-icon name="drag_indicator" size="16px" class="handle-icon" />
    </div>

    <!-- 노드 컨텐츠 -->
    <div class="node-content" :class="{ 'has-children': hasChildren }">
      <!-- 노드 타입에 따른 컨텐츠 렌더링 -->
      <!-- 확장 노드인 경우 -->
      <div v-if="isExtensionNode" class="extension-node">
        <component
          :is="extensionComponent"
          :node="localNode"
          @update="handleExtensionNodeUpdate"
        />
      </div>
      <!-- 기본 노드인 경우 -->
      <div
        v-else
        :class="nodeTypeClass"
        ref="contentWrapper"
      >
        <!-- 체크박스 (할 일 노드) -->
        <q-checkbox
          v-if="localNode.type === 'todo'"
          v-model="todoChecked"
          class="todo-checkbox"
          @update:model-value="handleTodoStateUpdate"
        />

        <!-- 글머리 기호 (bullet, numbered) -->
        <div v-if="localNode.type === 'bullet'" class="bullet-marker">•</div>
        <div v-if="localNode.type === 'numbered'" class="number-marker">1.</div>

        <!-- 편집 가능한 컨텐츠 -->
        <div
          v-if="localNode.type !== 'divider'"
          ref="inputRef"
          class="editable-content"
          :class="{
            'todo-checked': localNode.type === 'todo' && todoChecked,
            [`heading-${localNode.metadata?.level || 1}`]: localNode.type === 'heading',
            'code-content': localNode.type === 'code'
          }"
          contenteditable="true"
          @input="handleContentInput"
          @keydown="localNode.type === 'code' ? handleKeyDownCode : handleKeyDown"
          @focus="handleFocus"
          @blur="handleBlur"
          @paste="handlePaste"
          :placeholder="getPlaceholder()"
        >{{ localNode.content }}</div>

        <!-- 구분선 노드 -->
        <hr v-if="localNode.type === 'divider'" class="divider" />
      </div>

      <!-- 노드 메뉴 버튼 -->
      <div v-if="isFocused && !isExtensionNode" class="node-actions">
        <q-btn
          round
          flat
          size="xs"
          icon="more_horiz"
          color="grey-7"
          @click.stop="showNodeMenu"
        />
      </div>

      <!-- 노드 추가 버튼 -->
      <div class="add-button" v-if="showAddButton">
        <q-btn
          round
          flat
          size="xs"
          icon="add"
          color="blue-7"
          @click.stop="addNodeAfter"
        />
      </div>
    </div>

    <!-- 자식 노드 (향후 확장성) -->
    <div v-if="hasChildren" class="children-container">
      <slot name="children"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch, onMounted, nextTick, computed, markRaw } from 'vue';
import { NoteNode } from 'src/models/NoteNode';
import extensionManager from 'src/services/ExtensionManager';

// 속성 정의
const props = defineProps<{
  node: NoteNode,
  level?: number,
  index?: number,
  hasChildren?: boolean
}>();

// 이벤트 정의
const emit = defineEmits([
  'update',
  'slash-triggered',
  'add-node',
  'focus-node',
  'remove-node',
  'merge-with-previous',
  'move-node',
  'node-menu'
]);

// 상태 관리
const localNode = ref<NoteNode>({ ...props.node });
const inputRef = ref<HTMLElement | null>(null);
const dragHandleRef = ref<HTMLElement | null>(null);
const contentWrapper = ref<HTMLElement | null>(null);
const isFocused = ref(false);
const showAddButton = ref(false);
const todoChecked = ref(props.node.metadata?.checked || false);

// 확장 노드 관련 계산된 속성
const isExtensionNode = computed(() => {
  return extensionManager.getExtensionComponent(localNode.value.type) !== null;
});

const extensionComponent = computed(() => {
  if (!isExtensionNode.value) return null;

  const component = extensionManager.getExtensionComponent(localNode.value.type);
  return component ? markRaw(component.component) : null;
});

// 계산된 속성
const nodeTypeClass = computed(() => {
  return {
    'text-node': localNode.value.type === 'text',
    'heading-node': localNode.value.type === 'heading',
    'todo-node': localNode.value.type === 'todo',
    'bullet-node': localNode.value.type === 'bullet',
    'numbered-node': localNode.value.type === 'numbered',
    'code-node': localNode.value.type === 'code',
    'quote-node': localNode.value.type === 'quote',
    'divider-node': localNode.value.type === 'divider'
  };
});

// ================ 노드 생명주기 관리 ================

// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  // 로컬 노드 정보 복사
  localNode.value = { ...props.node };

  // 확장 노드인 경우 초기화
  if (isExtensionNode.value) {
    const extComponent = extensionManager.getExtensionComponent(localNode.value.type);
    if (extComponent && extComponent.initialize) {
      localNode.value = extComponent.initialize(localNode.value);
      emit('update', localNode.value);
    }
  }

  // 할 일 노드 상태 초기화
  if (localNode.value.type === 'todo' && localNode.value.metadata) {
    todoChecked.value = !!localNode.value.metadata.checked;
  }

  // 드래그 핸들 이벤트 추가
  if (dragHandleRef.value) {
    dragHandleRef.value.setAttribute('draggable', 'true');
    dragHandleRef.value.addEventListener('dragstart', handleDragStart);
  }

  // 노드 호버 이벤트 리스너 추가
  const nodeWrapper = document.querySelector(`[data-node-id="${props.node.id}"]`);
  if (nodeWrapper) {
    nodeWrapper.addEventListener('mouseenter', () => {
      showAddButton.value = true;
    });
    nodeWrapper.addEventListener('mouseleave', () => {
      if (!isFocused.value) {
        showAddButton.value = false;
      }
    });
  }
});

// props 변경 감지
watch(() => props.node, (newNode) => {
  localNode.value = { ...newNode };

  // 할 일 노드 상태 업데이트
  if (localNode.value.type === 'todo' && localNode.value.metadata) {
    todoChecked.value = !!localNode.value.metadata.checked;
  }
}, { deep: true });

// ================ 이벤트 핸들러 ================

// 확장 노드 업데이트 핸들러
function handleExtensionNodeUpdate(updatedNode: NoteNode) {
  localNode.value = { ...updatedNode };
  emit('update', localNode.value);
}

// 노드 클릭 처리
function handleNodeClick(event: MouseEvent) {
  // 이미 포커스된 경우, 확장 노드이거나 구분선은 무시
  if (isFocused.value || isExtensionNode.value || localNode.value.type === 'divider') return;

  // input 요소에 포커스
  focus();
}

// 편집 가능한 컨텐츠 입력 처리
function handleContentInput(event: Event) {
  const target = event.target as HTMLElement;
  const content = target.textContent || '';

  // 내용 업데이트
  localNode.value.content = content;
  emit('update', localNode.value);

  // 슬래시 명령 감지
  if (content === '/') {
    const rect = target.getBoundingClientRect();
    emit('slash-triggered', {
      top: rect.bottom,
      left: rect.left,
      nodeId: props.node.id
    });
  }
}

// 포커스 처리
function handleFocus() {
  isFocused.value = true;
}

// 블러 처리
function handleBlur() {
  isFocused.value = false;
  setTimeout(() => {
    showAddButton.value = false;
  }, 100);
}

// 할 일 상태 업데이트
function handleTodoStateUpdate() {
  if (!localNode.value.metadata) {
    localNode.value.metadata = {};
  }
  localNode.value.metadata.checked = todoChecked.value;
  emit('update', localNode.value);
}

// 노드 메뉴 표시
function showNodeMenu(event: Event) {
  event.stopPropagation();
  emit('node-menu', props.node.id);
}

// 붙여넣기 처리 - 서식 없는 텍스트만 허용
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') || '';
  document.execCommand('insertText', false, text);
}

// 노드 추가 버튼 클릭
function addNodeAfter(event: Event) {
  event.stopPropagation();
  emit('add-node', { after: props.node.id });
}

// 드래그 시작 처리
function handleDragStart(event: DragEvent) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('text/plain', props.node.id);
  event.dataTransfer.effectAllowed = 'move';

  // 드래그 이미지 설정
  if (contentWrapper.value) {
    const ghost = contentWrapper.value.cloneNode(true) as HTMLElement;
    ghost.style.width = `${contentWrapper.value.offsetWidth}px`;
    ghost.style.opacity = '0.5';
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 0, 0);

    // 잠시 후 ghost 요소 제거
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);
  }
}

// 노드에서의 키보드 이벤트 처리
function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  const selection = window.getSelection();
  if (!selection) return;

  const range = selection.getRangeAt(0);
  const textBeforeCursor = target.textContent?.substring(0, range.startOffset) || '';
  const textAfterCursor = target.textContent?.substring(range.endOffset) || '';

  // 노드 타입 변환 단축키
  if (event.key === ' ' && textBeforeCursor.trim() && !textBeforeCursor.includes(' ')) {
    const text = textBeforeCursor.trim();
    let newType = '';
    let metadata = {};

    switch (text) {
      case '#':
        newType = 'heading';
        metadata = { level: 1 };
        break;
      case '##':
        newType = 'heading';
        metadata = { level: 2 };
        break;
      case '###':
        newType = 'heading';
        metadata = { level: 3 };
        break;
      case '[]':
      case '[ ]':
        newType = 'todo';
        metadata = { checked: false };
        break;
      case '-':
      case '*':
        newType = 'bullet';
        break;
      case '1.':
        newType = 'numbered';
        break;
      case '>':
        newType = 'quote';
        break;
      case '```':
        newType = 'code';
        break;
      case '---':
        newType = 'divider';
        break;
    }

    if (newType) {
      event.preventDefault();
      localNode.value = {
        ...localNode.value,
        type: newType,
        content: '',
        metadata
      };
      emit('update', localNode.value);
      return;
    }
  }

  // Enter 키 처리 - 노드 타입별 특화 처리
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();

    // 노드 타입에 따른 Enter 처리
    switch (localNode.value.type) {
      case 'text':
      case 'heading':
        // 텍스트/헤딩 노드: 항상 새 노드 생성 (줄내림 없음)
        if (textAfterCursor.trim()) {
          // 현재 노드의 내용을 커서 위치까지로 업데이트
          localNode.value.content = textBeforeCursor;
          emit('update', localNode.value);

          // 새 노드 추가 (나머지 텍스트와 함께)
          emit('add-node', {
            after: props.node.id,
            type: 'text', // 헤딩 다음은 항상 텍스트 노드
            content: textAfterCursor,
            metadata: {}
          });
        } else {
          // 텍스트 없는 경우 - 새 빈 텍스트 노드 추가
          emit('add-node', {
            after: props.node.id,
            type: 'text',
            content: '',
            metadata: {}
          });
        }
        return;

      case 'todo':
        // 체크박스: 빈 상태에서 Enter
        if (!localNode.value.content.trim()) {
          // 체크박스 종료하고 일반 텍스트로 변환
          localNode.value = {
            ...localNode.value,
            type: 'text',
            content: '',
            metadata: {}
          };
          emit('update', localNode.value);
          return;
        }
        // 내용이 있을 때 - 새 체크박스 생성
        if (textAfterCursor.trim()) {
          // 현재 노드의 내용을 커서 위치까지로 업데이트
          localNode.value.content = textBeforeCursor;
          emit('update', localNode.value);

          // 새 체크박스 노드 추가 (나머지 텍스트와 함께)
          emit('add-node', {
            after: props.node.id,
            type: 'todo',
            content: textAfterCursor,
            metadata: { checked: false }
          });
        } else {
          // 새 체크박스 노드 추가
          emit('add-node', {
            after: props.node.id,
            type: 'todo',
            content: '',
            metadata: { checked: false }
          });
        }
        return;

      case 'quote':
        // 인용구: 빈 상태에서 Enter 또는 현재 줄이 비어있을 때 Enter
        if (!localNode.value.content.trim() ||
            (textBeforeCursor.trim() === '' && textAfterCursor.trim() === '')) {
          // 인용구 종료하고 일반 텍스트로 변환
          localNode.value = {
            ...localNode.value,
            type: 'text',
            content: '',
            metadata: {}
          };
          emit('update', localNode.value);
          return;
        }

        // 인용구 내용이 있을 때 - 내용에 따라 처리
        if (textAfterCursor.trim()) {
          // 현재 노드의 내용을 커서 위치까지로 업데이트
          localNode.value.content = textBeforeCursor;
          emit('update', localNode.value);

          // 새 인용구 추가 (나머지 텍스트와 함께)
          emit('add-node', {
            after: props.node.id,
            type: 'quote',
            content: textAfterCursor,
            metadata: {}
          });
        } else {
          // 새 텍스트 노드 추가
          emit('add-node', {
            after: props.node.id,
            type: 'text',
            content: '',
            metadata: {}
          });
        }
        return;

      case 'bullet':
      case 'numbered':
        // 글머리 기호, 번호 목록: 빈 상태에서 Enter
        if (!localNode.value.content.trim()) {
          // 글머리 기호 종료하고 일반 텍스트로 변환
          localNode.value = {
            ...localNode.value,
            type: 'text',
            content: '',
            metadata: {}
          };
          emit('update', localNode.value);
          return;
        }

        // 내용이 있을 때 - 동일한 타입의 새 노드 생성
        if (textAfterCursor.trim()) {
          // 현재 노드의 내용을 커서 위치까지로 업데이트
          localNode.value.content = textBeforeCursor;
          emit('update', localNode.value);

          // 새 노드 추가 (나머지 텍스트와 함께)
          emit('add-node', {
            after: props.node.id,
            type: localNode.value.type,
            content: textAfterCursor,
            metadata: {}
          });
        } else {
          // 새 동일 타입 노드 추가
          emit('add-node', {
            after: props.node.id,
            type: localNode.value.type,
            content: '',
            metadata: {}
          });
        }
        return;

      default:
        // 기타 노드 타입의 기본 처리
        break;
    }

    // 내용이 비어있고 특정 노드 타입인 경우, 일반 텍스트 노드로 변환
    if (!localNode.value.content.trim() &&
        ['bullet', 'numbered', 'todo', 'quote', 'heading'].includes(localNode.value.type)) {
      localNode.value = {
        ...localNode.value,
        type: 'text',
        content: '',
        metadata: {}
      };
      emit('update', localNode.value);
      return;
    }

    // 현재 노드 타입
    const currentType = localNode.value.type;

    // 새 노드의 기본 타입 결정 (일반적으로 현재 노드와 동일, 특별한 경우 제외)
    let newNodeType = currentType;
    let newNodeMetadata = {};

    // 특정 타입은 새 노드에 동일한 타입과 메타데이터 유지
    if (['bullet', 'numbered', 'todo'].includes(currentType)) {
      newNodeType = currentType;
      if (currentType === 'todo') {
        newNodeMetadata = { checked: false };
      }
    } else if (currentType === 'divider' || currentType === 'heading') {
      // 구분선, 제목 다음은 항상 텍스트 노드
      newNodeType = 'text';
    }

    // 현재 커서 위치 이후의 텍스트가 있는 경우
    if (textAfterCursor.trim()) {
      // 현재 노드의 내용을 커서 위치까지로 업데이트
      localNode.value.content = textBeforeCursor;
      emit('update', localNode.value);

      // 새 노드 추가 (나머지 텍스트와 함께)
      emit('add-node', {
        after: props.node.id,
        content: textAfterCursor,
        type: newNodeType,
        metadata: newNodeMetadata
      });
    } else {
      // 텍스트가 없는 경우, 새 빈 노드 추가
      emit('add-node', {
        after: props.node.id,
        type: newNodeType,
        content: '',
        metadata: newNodeMetadata
      });
    }
  }

  // Shift+Enter 키 처리 - 특정 노드 타입에서만 줄바꿈 허용
  else if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault();

    // 코드 블록과 인용구만 노드 내 줄바꿈 허용
    if (['code', 'quote'].includes(localNode.value.type)) {
      document.execCommand('insertLineBreak');
    } else {
      // 텍스트, 제목 등의 노드에서는 모든 노드 타입에서 새 노드 생성
      let newNodeType = 'text'; // 기본값은 텍스트 노드
      let newNodeMetadata = {};

      // 특정 타입은 동일한 타입의 노드 생성
      if (['bullet', 'numbered', 'todo'].includes(localNode.value.type)) {
        newNodeType = localNode.value.type;
        if (localNode.value.type === 'todo') {
          newNodeMetadata = { checked: false };
        }
      }

      // 새 노드 추가
      if (textAfterCursor.trim()) {
        // 현재 노드의 내용을 커서 위치까지로 업데이트
        localNode.value.content = textBeforeCursor;
        emit('update', localNode.value);

        // 새 노드 추가 (나머지 텍스트와 함께)
        emit('add-node', {
          after: props.node.id,
          content: textAfterCursor,
          type: newNodeType,
          metadata: newNodeMetadata
        });
      } else {
        // 새 빈 노드 추가
        emit('add-node', {
          after: props.node.id,
          type: newNodeType,
          content: '',
          metadata: newNodeMetadata
        });
      }
    }
  }

  // Backspace 키 처리
  else if (event.key === 'Backspace') {
    // 내용이 비어있거나 커서가 맨 앞에 있는 경우
    if (range.startOffset === 0) {
      // 노드 내용이 비어있고 선택 영역이 없는 경우 (정확한 빈 노드 확인)
      if ((!localNode.value.content || !localNode.value.content.trim()) && range.startOffset === range.endOffset) {
        event.preventDefault();

        if (localNode.value.type !== 'text') {
          // 노드 타입만 변경 (텍스트로)
          localNode.value = {
            ...localNode.value,
            type: 'text',
            metadata: {}
          };
          emit('update', localNode.value);
        } else {
          // 빈 텍스트 노드인 경우 - 이전 노드와 병합하거나 삭제
          // 명확하게 remove-node 이벤트만 발생시킴
          emit('remove-node', props.node.id);
          return; // 이벤트 처리 종료
        }
      }
      // 커서가 노드 시작 부분에 있고 내용이 있는 경우 - 이전 노드와 병합
      else if (range.startOffset === range.endOffset) {
        event.preventDefault();
        emit('merge-with-previous', props.node.id);
      }
    }
  }

  // 위쪽 화살표 키 처리
  else if (event.key === 'ArrowUp') {
    if (isCaretAtFirstLine(target)) {
      event.preventDefault();
      emit('focus-node', { id: props.node.id, direction: 'up' });
    }
  }

  // 아래쪽 화살표 키 처리
  else if (event.key === 'ArrowDown') {
    if (isCaretAtLastLine(target)) {
      event.preventDefault();
      emit('focus-node', { id: props.node.id, direction: 'down' });
    }
  }

  // Tab 키 처리 - 들여쓰기
  else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    emit('move-node', { id: props.node.id, indent: true });
  }

  // Shift+Tab 키 처리 - 내어쓰기
  else if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault();
    emit('move-node', { id: props.node.id, indent: false });
  }
}

// 코드 블록 키 이벤트 처리
function handleKeyDownCode(event: KeyboardEvent) {
  const target = event.target as HTMLElement;

  // Tab 키 처리 (코드 블록에서는 들여쓰기)
  if (event.key === 'Tab') {
    event.preventDefault();
    document.execCommand('insertText', false, '  ');
  }

  // Shift+Enter 키 처리 (코드 블록 종료 및 새 노드 생성)
  else if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault();
    emit('add-node', { after: props.node.id });
  }

  // Enter 키 처리 (줄바꿈 + 들여쓰기 유지)
  else if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();

    // 현재 줄의 들여쓰기 추출
    const content = target.textContent || '';
    const selection = window.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const cursorPos = range.startOffset;

    const lineStart = content.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineContent = content.substring(lineStart, cursorPos);
    const indentMatch = lineContent.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[0] : '';

    // 줄바꿈 + 들여쓰기 삽입
    document.execCommand('insertText', false, '\n' + indent);
  }

  // Backspace 키 처리 (내용이 비어있을 때 노드 타입 변경)
  else if (event.key === 'Backspace' && (target.textContent || '').trim() === '') {
    event.preventDefault();
    localNode.value = {
      ...localNode.value,
      type: 'text',
      content: '',
      metadata: {}
    };
    emit('update', localNode.value);
  }
}

// ================ 유틸리티 함수 ================

// 캐럿이 첫 번째 줄에 있는지 확인
function isCaretAtFirstLine(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // 캐럿 위치가 요소 상단에서 가까운 경우 (첫 번째 줄로 간주)
  return Math.abs(rect.top - elementRect.top) < 20;
}

// 캐럿이 마지막 줄에 있는지 확인
function isCaretAtLastLine(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // 캐럿 위치가 요소 하단에서 가까운 경우 (마지막 줄로 간주)
  return Math.abs(elementRect.bottom - rect.bottom) < 20;
}

// 노드 타입에 맞는 플레이스홀더 반환
function getPlaceholder(): string {
  switch (localNode.value.type) {
    case 'text': return '/를 입력해서 블록 추가...';
    case 'heading': return '제목';
    case 'todo': return '할 일';
    case 'bullet': return '글머리 기호 목록';
    case 'numbered': return '번호 목록';
    case 'code': return '코드 입력';
    case 'quote': return '인용구';
    default: return '';
  }
}

// ================ 외부 노출 메서드 ================

// 노드 포커스 설정
function focus(options?: { position?: 'start' | 'end' | 'custom', scrollIntoView?: boolean }) {
  // 확장 노드인 경우 포커스 건너뜀
  if (isExtensionNode.value) {
    isFocused.value = true;
    return;
  }

  const position = options?.position || 'start';
  const shouldScroll = options?.scrollIntoView !== false;

  // 포커스 설정
  nextTick(() => {
    if (inputRef.value) {
      const contentElement = inputRef.value as HTMLElement;

      try {
        // 포커스 설정 전에 내용 확인
        if (!contentElement.textContent && contentElement.childNodes.length === 0) {
          // 빈 텍스트 노드 추가 - 많은 브라우저에서 빈 contenteditable에 포커스 문제를 해결
          const textNode = document.createTextNode('');
          contentElement.appendChild(textNode);
        }

        // 포커스 설정
        contentElement.focus();
        isFocused.value = true;

        // 스크롤 위치 조정 (필요시)
        if (shouldScroll) {
          contentElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }

        // position이 custom인 경우 커서 위치는 외부에서 처리
        if (position === 'custom') {
          return;
        }

        // 커서 위치 설정
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();

        // 커서 위치 설정 (더 상세한 로직)
        if (position === 'start') {
          // 처음 위치에 커서 설정
          // 텍스트 노드가 있으면 그 노드에 설정, 없으면 컨텐츠 요소의 시작 위치에 설정
          if (contentElement.firstChild && contentElement.firstChild.nodeType === Node.TEXT_NODE) {
            range.setStart(contentElement.firstChild, 0);
          } else if (contentElement.firstChild) {
            range.setStartBefore(contentElement.firstChild);
          } else {
            range.setStart(contentElement, 0);
          }
        } else if (position === 'end') {
          // 끝 위치에 커서 설정
          // 마지막 자식이 텍스트 노드인 경우 그 노드의 끝에 설정
          if (contentElement.lastChild && contentElement.lastChild.nodeType === Node.TEXT_NODE) {
            const textNode = contentElement.lastChild as Text;
            range.setStart(textNode, textNode.length);
          } else if (contentElement.lastChild) {
            range.setStartAfter(contentElement.lastChild);
          } else {
            range.setStart(contentElement, 0);
          }
        }

        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        console.error('포커스/커서 설정 오류:', error);

        // 백업 포커스 방법 시도
        try {
          // 단순 포커스 시도
          contentElement.focus();
          isFocused.value = true;

          // 내용이 있는 경우 선택 시도
          if (contentElement.textContent) {
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(contentElement);

              // 위치에 따라 선택 영역 조정
              if (position === 'start') {
                range.collapse(true); // 시작 위치로 이동
              } else if (position === 'end') {
                range.collapse(false); // 끝 위치로 이동
              }

              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        } catch (e) {
          console.error('백업 포커스 설정 실패:', e);
        }
      }
    }
  });
}

// 외부에서 접근 가능한 메서드 노출
defineExpose({
  focus
});
</script>

<style scoped>
.node-wrapper {
  position: relative;
  padding: 3px 0;
  margin: 1px 0;
  transition: background-color 0.15s;
  border-radius: 4px;
}

.node-wrapper:hover {
  background-color: rgba(55, 53, 47, 0.03);
}

.is-focused {
  background-color: rgba(35, 131, 226, 0.08);
}

.node-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: opacity 0.2s;
  color: #9e9e9e;
}

.node-wrapper:hover .node-handle {
  opacity: 0.6;
}

.node-content {
  display: flex;
  position: relative;
  min-height: 24px;
}

/* 노드 타입별 스타일 */
.text-node, .heading-node, .todo-node, .bullet-node,
.numbered-node, .code-node, .quote-node {
  display: flex;
  width: 100%;
  align-items: flex-start;
}

/* 할 일 노드 */
.todo-checkbox {
  margin: 4px 8px 0 0;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.todo-node {
  transition: color 0.2s;
}

.todo-checked {
  text-decoration: line-through;
  color: rgba(55, 53, 47, 0.6) !important;
  transition: all 0.3s ease;
}

/* 글머리 기호 노드 */
.bullet-marker, .number-marker {
  width: 24px;
  margin-right: 8px;
  text-align: right;
  color: rgba(55, 53, 47, 0.6);
  padding-top: 4px;
  flex-shrink: 0;
}

/* 제목 스타일 */
.heading-1 {
  font-size: 1.875em;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 0.8em;
  margin-bottom: 0.3em;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}

.heading-2 {
  font-size: 1.5em;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 0.7em;
  margin-bottom: 0.3em;
  color: #2c2c2c;
}

.heading-3 {
  font-size: 1.25em;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 0.6em;
  margin-bottom: 0.3em;
  color: #3a3a3a;
}

/* 코드 노드 */
.code-node {
  background-color: rgb(247, 246, 243);
  border-radius: 3px;
  width: 100%;
  margin: 2px 0;
}

.code-content {
  font-family: SFMono-Regular, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 인용구 노드 */
.quote-node {
  border-left: 3px solid rgba(55, 53, 47, 0.4);
  padding-left: 14px;
  margin: 4px 0 4px 2px;
  background-color: rgba(55, 53, 47, 0.03);
  border-radius: 0 4px 4px 0;
  transition: all 0.2s ease;
}

.quote-node:hover {
  border-left-color: rgba(55, 53, 47, 0.6);
  background-color: rgba(55, 53, 47, 0.05);
}

.quote-node .editable-content {
  padding: 6px 8px 6px 2px;
  font-style: italic;
  color: rgba(55, 53, 47, 0.85);
}

/* 구분선 노드 */
.divider-node {
  padding: 6px 0;
  cursor: pointer;
  width: 100%;
}

.divider {
  border: none;
  height: 1px;
  background-color: rgba(55, 53, 47, 0.15);
  margin: 10px 0;
}

/* 편집 가능한 콘텐츠 스타일 */
.editable-content {
  flex: 1;
  min-height: 24px;
  outline: none;
  padding: 3px 2px;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: rgb(55, 53, 47);
  white-space: pre-wrap;
  word-break: break-word;
}

.editable-content:empty:before {
  content: attr(placeholder);
  color: rgba(55, 53, 47, 0.4);
  pointer-events: none;
}

/* 노드 메뉴 버튼 */
.node-actions {
  position: absolute;
  right: 8px;
  top: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.is-focused:hover .node-actions {
  opacity: 1;
}

/* 노드 추가 버튼 */
.add-button {
  position: absolute;
  left: -24px;
  top: -10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.node-wrapper:hover .add-button {
  opacity: 1;
}

/* 자식 노드 (들여쓰기용) */
.children-container {
  margin-left: 30px;
}

.has-children {
  margin-bottom: 2px;
}

/* 확장 노드 스타일 */
.extension-node {
  width: 100%;
  padding: 2px 0;
  border-radius: 4px;
  overflow: hidden;
}

.extension-node:focus-within {
  outline: 2px solid rgba(35, 131, 226, 0.2);
}
</style>

