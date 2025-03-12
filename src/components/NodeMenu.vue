<template>
  <div>
    <div v-if="showMenu" class="menu-container" ref="menuContainer">
      <q-list
        class="node-menu q-py-sm"
        bordered
        separator
        :style="{
          position: 'fixed',
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          zIndex: 10000
        }"
        @keydown="handleKeyDown"
        ref="listRef"
      >
        <!-- 검색 필드 -->
        <div class="search-container q-pa-sm">
          <q-input
            v-model="searchQuery"
            outlined
            dense
            placeholder="명령 검색..."
            class="menu-search"
            clearable
            autofocus
            ref="searchInput"
            @keydown.stop
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <!-- 최근 사용 명령어 (있는 경우) -->
        <template v-if="recentCommands.length > 0 && !searchQuery">
          <q-item-label header class="text-grey-8">최근 사용</q-item-label>
          <q-item
            v-for="item in recentCommands"
            :key="'recent-' + item.id"
            clickable
            :active="currentIndex === getItemIndex(item)"
            @click="selectItem(item)"
            v-ripple
            class="menu-item"
          >
            <q-item-section avatar>
              <div class="item-icon" :style="`background-color: ${item.color};`">
                <q-icon :name="item.icon" size="18px" color="white" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.title }}</q-item-label>
              <q-item-label caption>{{ item.description }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator spaced />
        </template>

        <!-- 그룹별 명령어 -->
        <template v-for="(group, groupName) in groupedItems" :key="groupName">
          <q-item-label header class="text-grey-8">{{ group.title }}</q-item-label>
          <q-item
            v-for="item in group.items"
            :key="item.id"
            clickable
            :active="currentIndex === getItemIndex(item)"
            @click="selectItem(item)"
            v-ripple
            class="menu-item"
          >
            <q-item-section avatar>
              <div class="item-icon" :style="`background-color: ${item.color};`">
                <q-icon :name="item.icon" size="18px" color="white" />
              </div>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.title }}</q-item-label>
              <q-item-label caption>{{ item.description }}</q-item-label>
            </q-item-section>
            <q-item-section side v-if="item.shortcut">
              <q-chip dense size="sm" class="shortcut-chip">
                {{ formatShortcut(item.shortcut) }}
              </q-chip>
            </q-item-section>
          </q-item>
        </template>

        <!-- 검색 결과가 없는 경우 -->
        <template v-if="filteredItems.length === 0 && searchQuery">
          <q-item>
            <q-item-section>
              <div class="text-center q-py-sm text-grey-7">
                <div>"{{ searchQuery }}"에 대한 결과가 없습니다</div>
              </div>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

// 속성 정의
const props = defineProps<{
  selectedNodeId: string;
  position: { top: number; left: number };
  show: boolean;
  mode?: 'slash' | 'node' | 'all'; // 모드 지정: slash - 슬래시 명령, node - 노드 메뉴, all - 모든 명령
}>();

// 이벤트 정의
const emit = defineEmits(['select', 'close']);

// 상태 관리
const showMenu = computed(() => props.show);
const menuPosition = ref({
  top: props.position.top,
  left: props.position.left
});
const searchQuery = ref('');
const currentIndex = ref(0);
const menuContainer = ref(null);
const listRef = ref(null);
const searchInput = ref(null);

// 로컬 스토리지에서 최근 사용 명령어 로드
const recentCommandsRaw = ref<string[]>(
  JSON.parse(localStorage.getItem('recentCommands') || '[]')
);

// 메뉴 아이템 정의
// 기본 노드 타입 명령어
const basicNodeCommands = [
  {
    id: 'text',
    type: 'text',
    title: '텍스트',
    description: '일반 텍스트 블록',
    icon: 'text_fields',
    color: '#37352F',
    group: '기본 블록'
  },
  {
    id: 'heading1',
    type: 'heading',
    metadata: { level: 1 },
    title: '제목 1',
    description: '대제목',
    icon: 'title',
    color: '#37352F',
    group: '기본 블록',
    shortcut: '#'
  },
  {
    id: 'heading2',
    type: 'heading',
    metadata: { level: 2 },
    title: '제목 2',
    description: '중제목',
    icon: 'title',
    color: '#37352F',
    group: '기본 블록',
    shortcut: '##'
  },
  {
    id: 'heading3',
    type: 'heading',
    metadata: { level: 3 },
    title: '제목 3',
    description: '소제목',
    icon: 'title',
    color: '#37352F',
    group: '기본 블록',
    shortcut: '###'
  },
  {
    id: 'todo',
    type: 'todo',
    metadata: { checked: false },
    title: '할 일',
    description: '체크박스가 있는 할 일',
    icon: 'check_box',
    color: '#2E79DB',
    group: '기본 블록',
    shortcut: '[]'
  },
  {
    id: 'bullet',
    type: 'bullet',
    title: '글머리 기호 목록',
    description: '글머리 기호가 있는 목록',
    icon: 'format_list_bulleted',
    color: '#F97141',
    group: '기본 블록',
    shortcut: '-'
  },
  {
    id: 'numbered',
    type: 'numbered',
    title: '번호 목록',
    description: '번호가 매겨진 목록',
    icon: 'format_list_numbered',
    color: '#F97141',
    group: '기본 블록',
    shortcut: '1.'
  },
  {
    id: 'quote',
    type: 'quote',
    title: '인용구',
    description: '인용 블록',
    icon: 'format_quote',
    color: '#9A6DD7',
    group: '기본 블록',
    shortcut: '>'
  },
  {
    id: 'code',
    type: 'code',
    title: '코드',
    description: '코드 블록',
    icon: 'code',
    color: '#E84C3D',
    group: '기본 블록',
    shortcut: '```'
  },
  {
    id: 'divider',
    type: 'divider',
    title: '구분선',
    description: '수평선',
    icon: 'horizontal_rule',
    color: '#9DA4AE',
    group: '기본 블록',
    shortcut: '---'
  }
];

// 노드 관리 명령어
const nodeManagementCommands = [
  {
    id: 'delete',
    action: 'delete',
    title: '노드 삭제',
    description: '현재 노드 삭제',
    icon: 'delete',
    color: '#E84C3D',
    group: '노드 관리',
    shortcut: 'Mod+Delete'
  },
  {
    id: 'duplicate',
    action: 'duplicate',
    title: '노드 복제',
    description: '현재 노드 복제',
    icon: 'content_copy',
    color: '#9DA4AE',
    group: '노드 관리',
    shortcut: 'Mod+D'
  },
  {
    id: 'indent',
    action: 'indent',
    title: '들여쓰기',
    description: '노드 들여쓰기',
    icon: 'format_indent_increase',
    color: '#9DA4AE',
    group: '노드 관리',
    shortcut: 'Tab'
  },
  {
    id: 'outdent',
    action: 'outdent',
    title: '내어쓰기',
    description: '노드 내어쓰기',
    icon: 'format_indent_decrease',
    color: '#9DA4AE',
    group: '노드 관리',
    shortcut: 'Shift+Tab'
  },
  {
    id: 'moveUp',
    action: 'moveUp',
    title: '위로 이동',
    description: '노드를 위로 이동',
    icon: 'arrow_upward',
    color: '#9DA4AE',
    group: '노드 관리',
    shortcut: 'Mod+ArrowUp'
  },
  {
    id: 'moveDown',
    action: 'moveDown',
    title: '아래로 이동',
    description: '노드를 아래로 이동',
    icon: 'arrow_downward',
    color: '#9DA4AE',
    group: '노드 관리',
    shortcut: 'Mod+ArrowDown'
  }
];

// 기타 확장 명령어 (추후 확장 가능)
const extensionCommands = [
  {
    id: 'image',
    type: 'image',
    title: '이미지',
    description: '이미지 삽입',
    icon: 'image',
    color: '#2E79DB',
    group: '미디어'
  },
  {
    id: 'table',
    type: 'table',
    title: '표',
    description: '표 삽입',
    icon: 'table_chart',
    color: '#F97141',
    group: '미디어'
  }
];

// 모든 명령어 정의
const allCommands = computed(() => {
  // 모드에 따라 표시할 명령어 필터링
  if (props.mode === 'slash') {
    return [...basicNodeCommands, ...extensionCommands];
  } else if (props.mode === 'node') {
    return [...nodeManagementCommands];
  }

  // 기본값으로 모든 명령어 반환
  return [...basicNodeCommands, ...nodeManagementCommands, ...extensionCommands];
});

// 검색어로 필터링된 명령어
const filteredItems = computed(() => {
  if (!searchQuery.value) return allCommands.value;

  const query = searchQuery.value.toLowerCase();
  return allCommands.value.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  );
});

// 그룹별로 정렬된 명령어
const groupedItems = computed(() => {
  const groups: Record<string, { title: string; items: any[] }> = {};

  filteredItems.value.forEach(item => {
    const group = item.group;
    if (!groups[group]) {
      groups[group] = {
        title: group,
        items: []
      };
    }
    groups[group].items.push(item);
  });

  return groups;
});

// 최근 사용 명령어
const recentCommands = computed(() => {
  return recentCommandsRaw.value
    .map(id => allCommands.value.find(cmd => cmd.id === id))
    .filter(item => item !== undefined)
    .slice(0, 5);
});

// 아이템 인덱스 조회
function getItemIndex(item: any): number {
  const allItems = getAllItems();
  return allItems.findIndex(i => i.id === item.id);
}

// 모든 아이템 목록 반환
function getAllItems(): any[] {
  // 최근 사용 명령어 + 그룹별 명령어
  const recentItems = recentCommands.value;
  const groupItems = Object.values(groupedItems.value).flatMap(group => group.items);

  if (searchQuery.value) {
    // 검색 시에는 최근 사용 명령어를 표시하지 않음
    return groupItems;
  }

  return [...recentItems, ...groupItems];
}

// 단축키 포맷팅
function formatShortcut(shortcut: string | undefined): string {
  if (!shortcut) return '';

  // Mac과 Windows/Linux에 맞게 단축키 표시 변경
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return shortcut
    .replace('Mod', isMac ? '⌘' : 'Ctrl')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('Shift', isMac ? '⇧' : 'Shift');
}

// 키보드 이벤트 처리
function handleKeyDown(event: KeyboardEvent) {
  const allItems = getAllItems();

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (allItems.length > 0) {
        currentIndex.value = (currentIndex.value + 1) % allItems.length;
        scrollToActiveItem();
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (allItems.length > 0) {
        currentIndex.value = (currentIndex.value - 1 + allItems.length) % allItems.length;
        scrollToActiveItem();
      }
      break;

    case 'Enter':
      event.preventDefault();
      if (allItems.length > 0) {
        selectItem(allItems[currentIndex.value]);
      }
      break;

    case 'Escape':
      event.preventDefault();
      emit('close');
      break;

    case 'Tab':
      // Tab 키는 기본 동작 방지 (포커스 이동 방지)
      event.preventDefault();
      break;
  }
}

// 활성 아이템으로 스크롤
function scrollToActiveItem() {
  nextTick(() => {
    const activeItem = document.querySelector('.node-menu .q-item--active');
    if (activeItem && listRef.value) {
      activeItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  });
}

// 아이템 선택 처리
function selectItem(item: any) {
  // 최근 사용 명령어에 추가
  const itemId = item.id;
  const recentIndex = recentCommandsRaw.value.indexOf(itemId);

  if (recentIndex !== -1) {
    // 이미 있으면 제거 후 맨 앞에 추가
    recentCommandsRaw.value.splice(recentIndex, 1);
  }

  // 맨 앞에 추가하고 10개로 제한
  recentCommandsRaw.value.unshift(itemId);
  if (recentCommandsRaw.value.length > 10) {
    recentCommandsRaw.value = recentCommandsRaw.value.slice(0, 10);
  }

  // 로컬 스토리지에 저장
  localStorage.setItem('recentCommands', JSON.stringify(recentCommandsRaw.value));

  // 타입 또는 액션 전달
  if ('type' in item) {
    // 노드 타입 명령
    emit('select', {
      type: item.type,
      metadata: item.metadata || {}
    });
  } else if ('action' in item) {
    // 노드 액션 명령
    emit('select', {
      action: item.action
    });
  }

  // 메뉴 닫기
  emit('close');
}

// 메뉴 위치 조정 (화면 밖으로 나가지 않도록)
function adjustMenuPosition() {
  nextTick(() => {
    const menuEl = document.querySelector('.node-menu') as HTMLElement;
    if (!menuEl) return;

    // 메뉴 크기
    const menuWidth = menuEl.offsetWidth || 320;
    const menuHeight = menuEl.offsetHeight || 400;

    // 화면 크기
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 위치 조정
    let { top, left } = props.position;

    // 오른쪽 경계 체크
    if (left + menuWidth > windowWidth - 10) {
      left = Math.max(10, windowWidth - menuWidth - 10);
    }

    // 아래쪽 경계 체크
    if (top + menuHeight > windowHeight - 10) {
      // 위쪽에 공간이 있으면 위에 표시
      if (top > menuHeight + 10) {
        top = top - menuHeight - 10;
      } else {
        // 위쪽에 공간이 부족하면 가운데 정렬
        top = Math.max(10, (windowHeight - menuHeight) / 2);
      }
    }

    // 최종 위치 설정
    menuPosition.value = { top, left };
  });
}

// 메뉴 외부 클릭 감지
function handleClickOutside(event: MouseEvent) {
  if (menuContainer.value && !(menuContainer.value as Element).contains(event.target as Node)) {
    emit('close');
  }
}

// props 변경 감지
watch(() => props.position, () => {
  adjustMenuPosition();
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    // 메뉴가 열릴 때 위치 조정 및 검색 초기화
    adjustMenuPosition();
    searchQuery.value = '';
    currentIndex.value = 0;

    // 검색 입력에 포커스
    nextTick(() => {
      if (searchInput.value) {
        (searchInput.value as HTMLElement).focus();
      }
    });
  }
});

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  adjustMenuPosition();
  document.addEventListener('click', handleClickOutside);
});

// 컴포넌트 언마운트 시 정리
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
.node-menu {
  min-width: 320px;
  max-width: 380px;
  max-height: 450px;
  overflow-y: auto;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.15);
}

.menu-search {
  width: 100%;
}

.item-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.menu-item {
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }

  &.q-item--active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.shortcut-chip {
  background-color: #f1f1f1;
  color: #606060;
  font-size: 0.7rem;
  padding: 0 6px;
  font-family: monospace;
  height: 20px;
}
</style>
