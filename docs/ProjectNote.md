# ProjectNote.md

## 노드: 프로젝트 개요
- **ID**: `project-overview`
- **Type**: `text`
- **Content**: Quasar Framework 2를 사용해 노드형 노트 앱을 만드는 프로젝트. AI를 활용해 프로젝트 생성, 파일 트리 구성, 코드 작성을 자동화하려고 함.
- **Metadata**: { "status": "진행 중" }

## 노드: 프로젝트 생성 명령어
- **ID**: `project-setup`
- **Type**: `code`
- **Content**:
  ```
  npm install -g @quasar/cli
  quasar create my-note-app --kit vue3 --ts
  cd my-note-app
  npm install vuedraggable uuid
  ```
- **Metadata**: { "description": "Quasar 프로젝트 생성 및 필수 의존성 설치" }

## 노드: 파일 트리 구조
- **ID**: `file-tree`
- **Type**: `text`
- **Content**:
  ```
  my-note-app/
  ├── public/
  │   ├── favicon.ico            // 정적 파일
  │   └── index.html
  ├── src/
  │   ├── assets/
  │   ├── components/
  │   │   ├── NodeComponent.vue  // 개별 노드 렌더링 컴포넌트
  │   │   └── NodeMenu.vue       // 슬래시 메뉴 팝업 컴포넌트
  │   ├── layouts/
  │   │   └── MainLayout.vue     // 메인 레이아웃 컴포넌트
  │   ├── pages/
  │   │   └── NotesPage.vue       // 노트 작성 페이지
  │   ├── router/
  │   │   └── index.ts            // 라우터 설정
  │   ├── store/
  │   │   └── notes.ts            // 노드 데이터 모델
  │   ├── models/
  │   │   └── NoteNode.ts         // 노드 모델
  │   ├── App.vue
  │   ├── boot/                   // 부트 파일 (플러그인 등)
  │   └── css/
  │       └── app.scss
  ├── quasar.config.js            // Quasar 설정 파일
  ├── package.json
  └── tsconfig.json               // TypeScript 설정 (선택)
  ```
- **Metadata**: { "description": "프로젝트 파일 구조" }

## 노드: 파일 생성 및 코드 추가
### 노드: MainLayout.vue
- **ID**: `main-layout`
- **Type**: `code`
- **Content**:
  ```vue
  <template>
    <q-layout view="lHh Lpr lFf">
      <q-header elevated>
        <q-toolbar>
          <q-toolbar-title>노드형 노트</q-toolbar-title>
        </q-toolbar>
      </q-header>
      <q-page-container>
        <router-view />
      </q-page-container>
    </q-layout>
  </template>

  <script setup lang="ts">
  import { defineComponent } from 'vue';
  export default defineComponent({
    name: 'MainLayout',
  });
  </script>
  ```
- **ParentId**: `file-tree`
- **Metadata**: { "path": "src/layouts/MainLayout.vue" }

### 노드: NotesPage.vue
- **ID**: `notes-page`
- **Type**: `code`
- **Content**:
  ```vue
  <template>
    <q-page class="q-pa-md">
      <q-btn label="새 노드 추가" color="primary" @click="addNode" />
      <div class="node-container q-mt-md">
        <draggable v-model="nodes" item-key="id" @end="updateHierarchy">
          <template #item="{ element }">
            <NodeComponent
              :node="element"
              @update="updateNode"
              @slash-triggered="showNodeMenu"
            />
          </template>
        </draggable>
      </div>
      <NodeMenu
        v-if="menuVisible"
        :position="menuPosition"
        @select="handleNodeSelect"
        @close="menuVisible = false"
      />
    </q-page>
  </template>

  <script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useNoteStore } from 'src/store/notes';
  import NodeComponent from 'src/components/NodeComponent.vue';
  import NodeMenu from 'src/components/NodeMenu.vue';
  import draggable from 'vuedraggable';
  import { v4 as uuidv4 } from 'uuid';

  const store = useNoteStore();
  const nodes = computed({
    get: () => store.document.nodes,
    set: (val) => (store.document.nodes = val),
  });

  function addNode() {
    const newNode = { id: uuidv4(), type: 'text' as const, content: '' };
    store.addNode(newNode);
  }

  function updateNode(updatedNode: NoteNode) {
    store.updateNode(updatedNode.id, updatedNode);
  }

  function updateHierarchy() {}

  const menuVisible = ref(false);
  const menuPosition = ref({ top: 0, left: 0 });

  function showNodeMenu({ top, left }: { top: number; left: number }) {
    menuPosition.value = { top, left };
    menuVisible.value = true;
  }

  function handleNodeSelect(type: NoteNode['type']) {
    const newNode = {
      id: uuidv4(),
      type,
      content: type === 'text' ? '' : type === 'todo' ? '할 일' : '코드 입력',
      metadata: type === 'todo' ? { checked: false } : undefined,
    };
    store.addNode(newNode);
    menuVisible.value = false;
  }
  </script>

  <style scoped>
  .node-container { max-width: 800px; margin: 0 auto; }
  </style>
  ```
- **ParentId**: `file-tree`
- **Metadata**: { "path": "src/pages/NotesPage.vue" }

### 노드: NodeComponent.vue
- **ID**: `node-component`
- **Type**: `code`
- **Content**:
  ```vue
  <template>
    <q-card class="node-card q-mb-md">
      <q-card-section>
        <div v-if="node.type === 'text'">
          <q-input
            v-model="localNode.content"
            outlined
            @input="handleInput"
            @keyup="checkSlash"
            placeholder="텍스트 입력"
          />
        </div>
        <div v-else-if="node.type === 'todo'" class="row items-center">
          <q-checkbox
            v-model="localNode.metadata!.checked"
            @input="handleInput"
          />
          <q-input
            v-model="localNode.content"
            outlined
            @input="handleInput"
            placeholder="할 일 입력"
          />
        </div>
        <div v-else-if="node.type === 'code'">
          <q-input
            v-model="localNode.content"
            type="textarea"
            outlined
            @input="handleInput"
            placeholder="코드 입력"
          />
        </div>
      </q-card-section>
    </q-card>
  </template>

  <script setup lang="ts">
  import { defineProps, defineEmits, ref, onMounted, watch } from 'vue';
  import { NoteNode } from 'src/models/NoteNode';

  const props = defineProps<{ node: NoteNode }>();
  const emit = defineEmits(['update', 'slash-triggered']);
  const localNode = ref({ ...props.node });

  function handleInput() {
    emit('update', localNode.value);
  }

  function checkSlash(event: KeyboardEvent) {
    if (event.key === '/' && localNode.value.content.endsWith('/')) {
      const input = event.target as HTMLInputElement;
      const rect = input.getBoundingClientRect();
      emit('slash-triggered', {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }

  onMounted(() => { localNode.value = { ...props.node }; });
  watch(() => props.node, (newNode) => { localNode.value = { ...newNode }; }, { deep: true });
  </script>

  <style scoped>
  .node-card { max-width: 600px; }
  </style>
  ```
- **ParentId**: `file-tree`
- **Metadata**: { "path": "src/components/NodeComponent.vue" }

### 노드: NodeMenu.vue
- **ID**: `node-menu`
- **Type**: `code`
- **Content**:
  ```vue
  <template>
    <q-menu
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      auto-close
      @hide="emit('close')"
    >
      <q-list dense>
        <q-item clickable @click="emit('select', 'text')">
          <q-item-section>텍스트</q-item-section>
        </q-item>
        <q-item clickable @click="emit('select', 'todo')">
          <q-item-section>할 일</q-item-section>
        </q-item>
        <q-item clickable @click="emit('select', 'code')">
          <q-item-section>코드</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </template>

  <script setup lang="ts">
  import { defineProps, defineEmits } from 'vue';
  import { NoteNode } from 'src/models/NoteNode';

  defineProps<{ position: { top: number; left: number } }>();
  const emit = defineEmits(['select', 'close']);
  </script>
  ```
- **ParentId**: `file-tree`
- **Metadata**: { "path": "src/components/NodeMenu.vue" }

### 노드: NoteNode.ts
- **ID**: `note-node-model`
- **Type**: `code`
- **Content**:
  ```typescript
  export interface NoteNode {
    id: string;
    type: 'text' | 'todo' | 'code';
    content: string;
    children?: NoteNode[];
    parentId?: string;
    links?: string[];
    metadata?: { checked?: boolean };
  }

  export interface NoteDocument {
    nodes: NoteNode[];
    rootId: string;
  }
  ```
- **ParentId**: `file-tree`
- **Metadata**: { "path": "src/models/NoteNode.ts" }

### 노드: notes.ts
- **ID**: `notes-store`
- **Type**: `code`
- **Content**:
  ```typescript
  import { defineStore } from 'pinia';
  import { NoteNode, NoteDocument } from 'src/models/NoteNode';

  export const useNoteStore = defineStore('notes', {
    state: () => ({
      document: {
        nodes: [],
        rootId: '',
      } as NoteDocument,
    }),
    actions: {
      addNode(node: NoteNode) {
        this.document.nodes.push(node);
        if (!this.document.rootId) this.document.rootId = node.id;
        this.saveToLocal();
      },
      updateNode(id: string, updates: Partial<NoteNode>) {
        const node = this.document.nodes.find(n => n.id === id);
        if (node) {
          Object.assign(node, updates);
          this.saveToLocal();
        }
      },
      saveToLocal() {
        localStorage.setItem('notes', JSON.stringify(this.document));
      },
      loadFromLocal() {
        const saved = localStorage.getItem('notes');
        if (saved) this.document = JSON.parse(saved);
      },
    },
  });
  ```
- **ParentId**: `file-tree`
- **Metadata**: { "path": "src/store/notes.ts" }

## 노드: AI 작업 지시
- **ID**: `ai-instructions`
- **Type**: `text`
- **Content**:
  ```
  1. 위 "프로젝트 생성 명령어"를 실행해 Quasar 프로젝트를 생성하세요.
  2. "파일 트리 구조"를 기반으로 디렉토리와 파일을 생성하세요.
  3. 각 파일 노드(MainLayout.vue, NotesPage.vue 등)의 "Content"를 해당 경로에 작성하세요.
  4. 프로젝트를 실행(quasar dev)해 동작을 확인하세요.
  ```
- **Metadata**: { "priority": "높음" }

---

### 사용 방법
AI가 이 `ProjectNote.md`를 읽고 작업을 수행하도록 요청하면:
1. 프로젝트를 생성하고 의존성을 설치합니다.
2. 파일 트리를 구성합니다.
3. 각 파일에 코드를 작성합니다.
4. `quasar dev`로 앱을 실행해 테스트합니다.

추가 기능(예: 이미지 노드, 코드 하이라이팅)이 필요하면 노드를 추가해 요청할 수 있습니다. 이 구조는 확장성과 명확성을 유지하며 AI가 쉽게 파싱할 수 있습니다.
