<template>
  <q-list
    class="slash-menu q-py-sm"
    @keydown="handleKeyDown"
    tabindex="-1"
    ref="listRef"
    bordered
    separator
    :style="`position: absolute; top: ${props.position.top}px; left: ${props.position.left}px;`"
  >
    <!-- 검색 입력창 -->
    <div class="search-container q-pa-sm">
      <q-input
        v-model="searchQuery"
        outlined
        dense
        placeholder="검색..."
        class="menu-search"
        clearable
        autofocus
        ref="searchInput"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- 최근 사용 명령어 -->
    <template v-if="recentCommands.length > 0">
      <q-item-label header class="text-grey-8">최근 사용</q-item-label>
      <q-item
        v-for="(item, index) in recentCommands"
        :key="`recent-${index}`"
        clickable
        :active="isSelected(item.value)"
        @click="selectItem(item.value)"
        v-ripple
        class="focusable-item"
      >
        <q-item-section avatar>
          <div class="item-icon" :style="`background-color: ${item.color};`">
            <q-icon :name="item.icon" size="20px" color="white" />
          </div>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ item.label }}</q-item-label>
          <q-item-label caption>{{ item.description }}</q-item-label>
        </q-item-section>
        <q-item-section side v-if="'shortcut' in item && item.shortcut">
          <q-chip dense size="sm" class="shortcut-chip">
            {{ formatShortcut(item.shortcut) }}
          </q-chip>
        </q-item-section>
      </q-item>
      <q-separator spaced />
    </template>

    <!-- 그룹별 메뉴 -->
    <template v-for="(group, groupName) in groupedItems" :key="groupName">
      <q-item-label header class="text-grey-8">
        {{ group.title }}
      </q-item-label>
      <q-item
        v-for="(item, index) in group.items"
        :key="`${groupName}-${index}`"
        clickable
        :active="isSelected(item.value)"
        @click="selectItem(item.value)"
        v-ripple
        class="focusable-item"
      >
        <q-item-section avatar>
          <div class="item-icon" :style="`background-color: ${item.color};`">
            <q-icon :name="item.icon" size="20px" color="white" />
          </div>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ item.label }}</q-item-label>
          <q-item-label caption>{{ item.description }}</q-item-label>
        </q-item-section>
        <q-item-section side v-if="item.shortcut">
          <q-chip dense size="sm" class="shortcut-chip">
            {{ formatShortcut(item.shortcut) }}
          </q-chip>
        </q-item-section>
      </q-item>
    </template>

    <!-- 결과 없음 -->
    <div v-if="totalItemsCount === 0" class="no-results q-pa-md text-center">
      <q-icon name="search_off" size="24px" color="grey-7" class="q-mb-sm" />
      <p class="text-grey-8 q-my-sm">검색 결과가 없습니다</p>
    </div>
  </q-list>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import extensionManager from 'src/services/ExtensionManager';

/**
 * 컴포넌트 속성
 */
const props = defineProps<{
  position: { top: number; left: number };
  selectedNodeId: string;
}>();

/**
 * 이벤트 에밋
 */
const emit = defineEmits(['select', 'close']);

/**
 * 상태 관리
 */
const searchQuery = ref('');
const currentIndex = ref(0);
const listRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLElement | null>(null);

// 최근 사용한 명령어 (로컬 스토리지에서 가져옴)
const recentCommandsStorage = localStorage.getItem('recentCommands') || '[]';
const savedRecentCommands = ref<string[]>(JSON.parse(recentCommandsStorage));

/**
 * 기본 메뉴 아이템 목록
 */
const menuItems = ref([
  {
    value: 'text',
    label: '텍스트',
    description: '일반 텍스트 블록',
    icon: 'text_fields',
    color: '#37474F',
    group: '기본',
    shortcut: 'Mod+Alt+0'
  },
  {
    value: 'heading1',
    label: '제목 1',
    description: '큰 제목',
    icon: 'title',
    color: '#0277BD',
    group: '기본',
    shortcut: 'Mod+Alt+1'
  },
  {
    value: 'heading2',
    label: '제목 2',
    description: '중간 제목',
    icon: 'title',
    color: '#0288D1',
    group: '기본',
    shortcut: 'Mod+Alt+2'
  },
  {
    value: 'heading3',
    label: '제목 3',
    description: '작은 제목',
    icon: 'title',
    color: '#039BE5',
    group: '기본',
    shortcut: 'Mod+Alt+3'
  },
  {
    value: 'todo',
    label: '할 일',
    description: '체크박스가 있는 할 일 목록',
    icon: 'check_box',
    color: '#388E3C',
    group: '서식',
    shortcut: 'Mod+Shift+T'
  },
  {
    value: 'bullet',
    label: '글머리 기호',
    description: '불릿 포인트로 된 목록',
    icon: 'format_list_bulleted',
    color: '#5E35B1',
    group: '서식',
    shortcut: 'Mod+Shift+8'
  },
  {
    value: 'numbered',
    label: '번호 매기기',
    description: '번호가 매겨진 목록',
    icon: 'format_list_numbered',
    color: '#512DA8',
    group: '서식',
    shortcut: 'Mod+Shift+7'
  },
  {
    value: 'code',
    label: '코드',
    description: '코드 블록',
    icon: 'code',
    color: '#616161',
    group: '서식',
    shortcut: 'Mod+Alt+C'
  },
  {
    value: 'quote',
    label: '인용구',
    description: '인용문 블록',
    icon: 'format_quote',
    color: '#455A64',
    group: '서식',
    shortcut: 'Mod+Shift+B'
  },
  {
    value: 'divider',
    label: '구분선',
    description: '컨텐츠 사이에 구분선 추가',
    icon: 'horizontal_rule',
    color: '#78909C',
    group: '서식',
    shortcut: 'Mod+Alt+H'
  },
]);

/**
 * 확장 노드를 메뉴 아이템으로 변환
 */
const extensionMenuItems = computed(() => {
  return extensionManager.allExtensions.value.map(ext => ({
    value: ext.type,
    label: ext.name,
    description: ext.description,
    icon: ext.icon,
    color: ext.color,
    group: '확장',
    author: ext.author
  }));
});

/**
 * 모든 메뉴 아이템 (기본 + 확장)
 */
const allMenuItems = computed(() => {
  return [...menuItems.value, ...extensionMenuItems.value];
});

/**
 * 검색어로 필터링된 메뉴 아이템
 */
const filteredItems = computed(() => {
  if (!searchQuery.value) return allMenuItems.value;

  const query = searchQuery.value.toLowerCase();
  return allMenuItems.value.filter(item =>
    item.label.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query) ||
    ('author' in item && item.author && item.author.toLowerCase().includes(query))
  );
});

/**
 * 그룹별로 정렬된 메뉴 아이템
 */
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

/**
 * 총 아이템 수
 */
const totalItemsCount = computed(() => {
  return filteredItems.value.length;
});

/**
 * 최근 사용 명령어
 */
const recentCommands = computed(() => {
  return savedRecentCommands.value
    .map(cmd => allMenuItems.value.find(item => item.value === cmd))
    .filter((item): item is typeof allMenuItems.value[number] => item !== undefined)
    .slice(0, 5);
});

/**
 * 단축키 포맷팅
 */
const formatShortcut = (shortcut: string | undefined) => {
  if (!shortcut) return '';
  return shortcut.replace('Mod', process.platform === 'darwin' ? '⌘' : 'Ctrl');
};

/**
 * 아이템 선택 여부 확인
 */
const isSelected = (value: string) => {
  const allItems = [...recentCommands.value, ...Object.values(groupedItems.value).flatMap(group => group.items)];
  return allItems[currentIndex.value]?.value === value;
};

/**
 * 키보드 이벤트 처리
 */
function handleKeyDown(event: KeyboardEvent) {
  const allItems = [...recentCommands.value, ...Object.values(groupedItems.value).flatMap(group => group.items)];

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (allItems.length > 0) {
        currentIndex.value = (currentIndex.value + 1) % allItems.length;
        scrollToItem();
      }
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (allItems.length > 0) {
        currentIndex.value = (currentIndex.value - 1 + allItems.length) % allItems.length;
        scrollToItem();
      }
      break;
    case 'Enter':
      event.preventDefault();
      if (allItems.length > 0) {
        selectItem(allItems[currentIndex.value].value);
      }
      break;
    case 'Escape':
      event.preventDefault();
      emit('close');
      break;
    case 'Tab':
      event.preventDefault();
      // 다음 그룹으로 이동
      navigateToNextGroup(event.shiftKey);
      break;
  }
}

/**
 * 다음 그룹으로 이동
 */
function navigateToNextGroup(reverse = false) {
  const groups = Object.keys(groupedItems.value);
  if (groups.length <= 1) return;

  const allItems = [...recentCommands.value, ...Object.values(groupedItems.value).flatMap(group => group.items)];
  const currentItem = allItems[currentIndex.value];
  if (!currentItem) return;

  const currentGroupIndex = groups.indexOf(currentItem.group);
  let nextGroupIndex;

  if (reverse) {
    // 이전 그룹으로 이동
    nextGroupIndex = (currentGroupIndex - 1 + groups.length) % groups.length;
  } else {
    // 다음 그룹으로 이동
    nextGroupIndex = (currentGroupIndex + 1) % groups.length;
  }

  const nextGroup = groups[nextGroupIndex];
  const nextGroupItems = nextGroup ? groupedItems.value[nextGroup]?.items : [];
  if (nextGroupItems && nextGroupItems.length > 0) {
    // 다음 그룹의 첫 번째 아이템으로 이동
    const nextItemIndex = allItems.findIndex(item => item.value === nextGroupItems[0].value);
    if (nextItemIndex !== -1) {
      currentIndex.value = nextItemIndex;
      scrollToItem();
    }
  }
}

/**
 * 선택된 아이템으로 스크롤
 */
function scrollToItem() {
  nextTick(() => {
    const activeItem = document.querySelector('.slash-menu .q-item--active');
    if (activeItem) {
      activeItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  });
}

/**
 * 아이템 선택
 */
function selectItem(value: string) {
  // 최근 사용 명령어에 추가
  if (!savedRecentCommands.value.includes(value)) {
    savedRecentCommands.value.unshift(value);
    if (savedRecentCommands.value.length > 10) {
      savedRecentCommands.value = savedRecentCommands.value.slice(0, 10);
    }
    localStorage.setItem('recentCommands', JSON.stringify(savedRecentCommands.value));
  } else {
    // 이미 있는 경우 맨 앞으로 이동
    const index = savedRecentCommands.value.indexOf(value);
    savedRecentCommands.value.splice(index, 1);
    savedRecentCommands.value.unshift(value);
    localStorage.setItem('recentCommands', JSON.stringify(savedRecentCommands.value));
  }

  emit('select', value);
  emit('close');
}

/**
 * 컴포넌트 마운트 시 초기화
 */
onMounted(() => {
  nextTick(() => {
    if (searchInput.value) {
      (searchInput.value as HTMLElement).focus();
    }
  });

  // 포커스 유지
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      emit('close');
    }
  });
});

/**
 * 검색어 변경 시 선택 인덱스 초기화
 */
watch(searchQuery, () => {
  currentIndex.value = 0;
});
</script>

<style lang="scss">
.slash-menu {
  width: 320px;
  max-height: 400px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  overflow-y: auto;

  .search-container {
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }

  .focusable-item {
    &:hover,
    &.q-item--active {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }

  .item-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .shortcut-chip {
    font-family: monospace;
    background: rgba(0, 0, 0, 0.05);
    color: $grey-8;
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }
}
</style>
