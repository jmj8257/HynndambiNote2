<!-- src/pages/NotesPage.vue -->
<template>
  <q-page class="notes-page">
    <div class="container">
      <div class="title-section">
        <q-input
          v-model="pageTitle"
          class="page-title-input"
          placeholder="제목 없음"
          borderless
          dense
          @update:model-value="savePage"
        />
      </div>

      <div class="notes-section"
           @click="handleBackgroundClick"
           @drop="handleDrop"
           @dragover.prevent>
        <!-- 노드 목록 -->
        <div class="nodes-container">
          <template v-for="(node, index) in flattenedNodes" :key="node.id">
            <NodeComponent
              :node="node"
              :index="index"
              :level="getNodeLevel(node)"
              :has-children="hasChildren(node)"
              @update="handleNodeUpdate"
              @slash-triggered="handleSlashMenu"
              @add-node="handleAddNode"
              @focus-node="handleFocusNode"
              @remove-node="handleRemoveNode"
              @merge-with-previous="handleMergeWithPrevious"
              @move-node="handleMoveNode"
              @node-menu="handleNodeMenu"
              ref="nodeRefs"
            >
              <template v-slot:children v-if="hasChildren(node)">
                <!-- 재귀적 렌더링은 여기서는 생략 (계층 구조 지원 예정) -->
              </template>
            </NodeComponent>
          </template>
        </div>

        <!-- 빈 상태 (노드가 없을 때) -->
        <div v-if="flattenedNodes.length === 0" class="empty-state">
          <div class="empty-text">
            <p>/를 입력해서 새로운 블록을 추가해보세요.</p>
            <p>또는 <a href="#" @click.prevent="addEmptyNode">여기를 클릭</a>해서 시작하세요.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 노드 메뉴 -->
    <NodeMenu
      v-if="showNodeMenu"
      :selected-node-id="activeNodeId"
      :position="menuPosition"
      :show="showNodeMenu"
      :mode="menuMode"
      @select="handleMenuSelect"
      @close="closeNodeMenu"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { uid } from 'quasar';
import NodeComponent from 'src/components/NodeComponent.vue';
import NodeMenu from 'src/components/NodeMenu.vue';
import { NoteNode } from 'src/models/NoteNode';
import extensionManager from 'src/services/ExtensionManager';

// 상태 관리
const nodes = ref<NoteNode[]>([]);
const nodeRefs = ref<any[]>([]);
const pageTitle = ref('제목 없음');

// 노드 계층 구조 관리
const nodeParents = ref<Record<string, string | null>>({});
const nodeLevels = ref<Record<string, number>>({});

// 메뉴 관련 상태
const showNodeMenu = ref(false);
const menuPosition = ref({ top: 0, left: 0 });
const activeNodeId = ref('');
const menuMode = ref<'slash' | 'node' | 'all'>('all');

// 자동 저장 타이머
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

// 계층 구조가 적용된 노드 목록
const flattenedNodes = computed(() => {
  // 현재는 단순히 노드 목록 그대로 반환
  // 추후 계층 구조 구현 시 확장 예정
  return nodes.value;
});

// 노드 초기화 및 설정
onMounted(() => {
  // 로컬 스토리지에서 노트 데이터 가져오기
  loadNotes();

  // 자동 저장 설정 (5초마다)
  autoSaveTimer = setInterval(() => saveNotes(), 5000);

  // 전역 키보드 이벤트 리스너 추가
  document.addEventListener('keydown', handleGlobalKeyDown);

  // 컴포넌트 언마운트 시 이벤트 리스너 제거
  onBeforeUnmount(() => {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    document.removeEventListener('keydown', handleGlobalKeyDown);
  });
});

// 전역 키보드 이벤트 처리
function handleGlobalKeyDown(event: KeyboardEvent) {
  // Ctrl+S (Cmd+S) - 저장
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    saveNotes();
  }
}

// =============== 노드 관리 기능 ===============

// 기본 노드 생성
function createDefaultNode(options: Partial<NoteNode> = {}): NoteNode {
  return {
    id: uid(),
    type: 'text',
    content: '',
    ...options,
  };
}

// 노드 업데이트 처리
function handleNodeUpdate(updatedNode: NoteNode) {
  const index = nodes.value.findIndex(node => node.id === updatedNode.id);
  if (index > -1) {
    nodes.value[index] = { ...updatedNode };
    saveNotes();
  }
}

// 슬래시 메뉴 표시
function handleSlashMenu(data: { top: number; left: number; nodeId: string }) {
  activeNodeId.value = data.nodeId;
  menuPosition.value = { top: data.top, left: data.left };
  menuMode.value = 'slash';
  showNodeMenu.value = true;
}

// 노드 메뉴 표시
function handleNodeMenu(nodeId: string) {
  const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) return;

  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
  if (!nodeElement) return;

  const rect = nodeElement.getBoundingClientRect();
  activeNodeId.value = nodeId;
  menuPosition.value = {
    top: rect.top + window.scrollY + 30,
    left: rect.left + window.scrollX
  };
  menuMode.value = 'node';
  showNodeMenu.value = true;
}

// 메뉴 닫기
function closeNodeMenu() {
  showNodeMenu.value = false;
}

// 메뉴 선택 처리
function handleMenuSelect(data: { type?: string; action?: string; metadata?: any }) {
  const nodeIndex = nodes.value.findIndex(n => n.id === activeNodeId.value);
  if (nodeIndex === -1) return;

  const selectedNode = nodes.value[nodeIndex];
  if (!selectedNode) return;

  // 타입 선택 처리
  if (data.type) {
    // 현재 노드가 비어있는 경우 타입 변경
    if (!selectedNode.content?.trim() && selectedNode.type === 'text') {
      selectedNode.type = data.type;
      selectedNode.metadata = data.metadata || {};

      // 슬래시 메뉴 키워드('/') 제거
      if (selectedNode.content === '/') {
        selectedNode.content = '';
      }

      // 변경 사항 저장
      handleNodeUpdate(selectedNode);

      // 노드에 포커스 설정 - 타이머로 지연 처리
      setTimeout(() => {
        nextTick(() => {
          const nodeRef = nodeRefs.value[nodeIndex];
          if (nodeRef && typeof nodeRef.focus === 'function') {
            nodeRef.focus({ position: 'start', scrollIntoView: true });
          }
        });
      }, 0);
    } else {
      // 현재 노드에 내용이 있는 경우 - 슬래시('/') 텍스트 제거
      if (selectedNode.content === '/') {
        selectedNode.content = '';
        handleNodeUpdate(selectedNode);
      }

      // 새 노드 추가 (현재 노드 바로 다음에)
      const newNode = handleAddNode({
        after: selectedNode.id,
        type: data.type,
        metadata: data.metadata || {}
      });

      // 새 노드에 포커스 - handleAddNode 내부에서 처리
    }
  }
  // 액션 선택 처리
  else if (data.action) {
    switch (data.action) {
      case 'delete':
        handleRemoveNode(selectedNode.id);
        break;
      case 'duplicate':
        duplicateNode(selectedNode.id);
        break;
      case 'indent':
        handleMoveNode({ id: selectedNode.id, indent: true });
        break;
      case 'outdent':
        handleMoveNode({ id: selectedNode.id, indent: false });
        break;
      case 'moveUp':
        moveNodeUpDown(selectedNode.id, 'up');
        break;
      case 'moveDown':
        moveNodeUpDown(selectedNode.id, 'down');
        break;
    }
  }

  // 메뉴 닫기
  closeNodeMenu();
}

// 노드 추가
function handleAddNode(data: { after: string, type?: string, content?: string, metadata?: any }): NoteNode | undefined {
  const afterIndex = nodes.value.findIndex(n => n.id === data.after);
  if (afterIndex === -1) return;

  const afterNode = nodes.value[afterIndex];
  if (!afterNode) return;

  // 새 노드 생성
  const newNode: NoteNode = createDefaultNode({
    type: data.type || afterNode.type,
    content: data.content || '',
    metadata: data.metadata || {}
  });

  // 부모-자식 관계 설정 (계층 구조에 필요)
  setNodeParent(newNode.id, nodeParents.value[afterNode.id] || null);

  // 동일한 레벨 설정 (노드 레벨 유지)
  setNodeLevel(newNode.id, getNodeLevel(afterNode));

  // 같은 레벨에 노드 추가
  nodes.value.splice(afterIndex + 1, 0, newNode);
  saveNotes();

  // 새 노드에 포커스 설정을 더 안정적으로 처리
  // 충분한 시간을 두고 DOM 업데이트 완료 보장 (75ms)
  setTimeout(() => {
    nextTick(() => {
      try {
        // DOM 업데이트 완료 후 포커스 설정
        const newNodeIndex = afterIndex + 1;
        if (
          newNodeIndex < nodes.value.length &&
          nodeRefs.value &&
          nodeRefs.value[newNodeIndex]
        ) {
          const newNodeRef = nodeRefs.value[newNodeIndex];
          if (typeof newNodeRef.focus === 'function') {
            newNodeRef.focus({
              position: 'start',
              scrollIntoView: true
            });
          }
        }
      } catch (error) {
        console.error('새 노드 포커스 설정 오류:', error);

        // 오류 발생 시 백업 로직으로 재시도
        try {
          const newNodeIndex = afterIndex + 1;
          if (newNodeIndex < nodes.value.length && nodes.value[newNodeIndex]?.id) {
            // 수동 포커스 설정 시도 - DOM API 사용
            const targetNode = nodes.value[newNodeIndex];
            const nodeElement = document.querySelector(`[data-node-id="${targetNode.id}"] .editable-content`);
            if (nodeElement instanceof HTMLElement) {
              nodeElement.focus();
            }
          }
        } catch (backupError) {
          console.error('백업 포커스 시도 실패:', backupError);
        }
      }
    });
  }, 75);

  // 생성된 노드 반환 (참조용)
  return newNode;
}

// 빈 노드 추가 (초기 상태)
function addEmptyNode() {
  if (nodes.value.length === 0) {
    nodes.value.push(createDefaultNode());
    saveNotes();

    // 새 노드에 포커스
    nextTick(() => {
      if (nodeRefs.value[0] && typeof nodeRefs.value[0].focus === 'function') {
        nodeRefs.value[0].focus();
      }
    });
  }
}

// 노드 삭제
function handleRemoveNode(nodeId: string) {
  const index = nodes.value.findIndex(n => n.id === nodeId);
  if (index === -1) return;

  // 삭제할 노드 참조 저장
  const nodeToRemove = nodes.value[index];
  if (!nodeToRemove) return;

  // 노드 삭제
  nodes.value.splice(index, 1);

  // 노드가 없으면 기본 노드 추가
  if (nodes.value.length === 0) {
    const defaultNode = createDefaultNode();
    nodes.value.push(defaultNode);
    saveNotes();

    // 새 노드에 포커스
    setTimeout(() => {
      nextTick(() => {
        if (nodeRefs.value && nodeRefs.value[0] && typeof nodeRefs.value[0].focus === 'function') {
          nodeRefs.value[0].focus({
            position: 'start',
            scrollIntoView: true
          });
        }
      });
    }, 50);
    return;
  }

  saveNotes();

  // 삭제 후 포커스 위치 결정 - 더 안정적이고 명확한 로직으로 개선
  setTimeout(() => {
    // 이전 노드 인덱스 (삭제 전 기준)
    const prevIndex = index - 1;
    const nextIndex = index; // 삭제 후에는 다음 노드가 현재 인덱스로 이동

    // 포커스를 줄 대상 인덱스 계산
    // 1. 이전 노드가 있으면 이전 노드에 포커스
    // 2. 이전 노드가 없지만 다음 노드가 있으면 다음 노드에 포커스(현재는 index 위치)
    // 3. 모두 없으면 아무것도 하지 않음
    let targetIndex = -1;

    if (prevIndex >= 0) {
      targetIndex = prevIndex; // 이전 노드 선호
    } else if (nextIndex < nodes.value.length) {
      targetIndex = nextIndex; // 이전 노드가 없으면 다음 노드(현재 인덱스)
    }

    if (targetIndex >= 0 && targetIndex < nodes.value.length) {
      const nodeRef = nodeRefs.value[targetIndex];
      if (nodeRef && typeof nodeRef.focus === 'function') {
        try {
          // 이전 노드면 끝에, 다음 노드면 시작에 커서 위치
          const position = targetIndex === prevIndex ? 'end' : 'start';
          nodeRef.focus({
            position,
            scrollIntoView: true
          });
        } catch (error) {
          console.error('삭제 후 포커스 설정 오류:', error);

          // 오류 발생 시 백업 로직으로 재시도
          try {
            if (nodes.value[targetIndex]?.id) {
              // 수동 포커스 설정 시도 - DOM API 사용
              const targetNode = nodes.value[targetIndex];
              const nodeElement = document.querySelector(`[data-node-id="${targetNode!.id}"] .editable-content`);
              if (nodeElement instanceof HTMLElement) {
                nodeElement.focus();
              }
            }
          } catch (backupError) {
            console.error('백업 포커스 시도 실패:', backupError);
          }
        }
      }
    }
  }, 75); // 충분한 지연 시간 설정으로 DOM 업데이트 완료 보장
}

// 노드 복제
function duplicateNode(nodeId: string) {
  const index = nodes.value.findIndex(n => n.id === nodeId);
  if (index === -1) return;

  const originalNode = nodes.value[index];
  const duplicatedNode = {
    ...JSON.parse(JSON.stringify(originalNode)),
    id: uid()
  };

  // 복제된 노드 삽입
  nodes.value.splice(index + 1, 0, duplicatedNode);
  saveNotes();

  // 복제된 노드에 포커스
  nextTick(() => {
    const nodeRef = nodeRefs.value[index + 1];
    if (nodeRef && typeof nodeRef.focus === 'function') {
      nodeRef.focus({
        position: 'start',
        scrollIntoView: true
      });
    }
  });
}

// 노드 위/아래 이동
function moveNodeUpDown(nodeId: string, direction: 'up' | 'down') {
  const index = nodes.value.findIndex(n => n.id === nodeId);
  if (index === -1) return;

  // 이동할 수 있는지 확인
  if (direction === 'up' && index === 0) return;
  if (direction === 'down' && index === nodes.value.length - 1) return;

  // 노드 위치 변경
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const nodeToMove = nodes.value[index];
  const targetNode = nodes.value[targetIndex];

  if (!nodeToMove || !targetNode) return;

  // 스왑
  nodes.value[targetIndex] = { ...nodeToMove };
  nodes.value[index] = { ...targetNode };
  saveNotes();

  // 이동된 노드에 포커스
  nextTick(() => {
    const nodeRef = nodeRefs.value[targetIndex];
    if (nodeRef && typeof nodeRef.focus === 'function') {
      nodeRef.focus({
        position: 'start',
        scrollIntoView: true
      });
    }
  });
}

// 노드 들여쓰기/내어쓰기 처리
function handleMoveNode(data: { id: string; indent: boolean }) {
  const index = nodes.value.findIndex(n => n.id === data.id);
  if (index === -1) return;

  const node = nodes.value[index];
  if (!node) return;

  // 레벨 계산
  const currentLevel = getNodeLevel(node);
  const newLevel = data.indent
    ? Math.min(currentLevel + 1, 10)  // 최대 10단계까지 들여쓰기 제한
    : Math.max(currentLevel - 1, 0);  // 0보다 작을 수 없음

  // 레벨 변경
  setNodeLevel(data.id, newLevel);
  saveNotes();
}

// 노드 포커스 처리
function handleFocusNode(data: { id: string; direction?: 'up' | 'down' }) {
  const index = nodes.value.findIndex(n => n.id === data.id);
  if (index === -1) return;

  // 이전/다음 노드 인덱스 계산
  let targetIndex = index;
  if (data.direction === 'up') {
    targetIndex = Math.max(0, index - 1);
  } else if (data.direction === 'down') {
    targetIndex = Math.min(nodes.value.length - 1, index + 1);
  }

  // 현재 노드와 다른 경우에만 포커스 변경
  if (targetIndex !== index) {
    nextTick(() => {
      const nodeRef = nodeRefs.value[targetIndex];
      if (nodeRef && typeof nodeRef.focus === 'function') {
        // 위로 이동 시 끝으로, 아래로 이동 시 처음으로 커서 이동
        const position = data.direction === 'up' ? 'end' : 'start';
        nodeRef.focus({
          position,
          scrollIntoView: true
        });
      }
    });
  }
}

// 이전 노드와 병합
function handleMergeWithPrevious(nodeId: string) {
  const index = nodes.value.findIndex(n => n.id === nodeId);
  if (index <= 0) return; // 첫 번째 노드는 병합할 이전 노드가 없음

  const currentNode = nodes.value[index];
  const previousNode = nodes.value[index - 1];

  if (!currentNode || !previousNode) return;

  // 이전 노드가 구분선이거나 확장 노드인 경우 병합 불가
  if (['divider'].includes(previousNode.type) ||
      extensionManager.getExtensionComponent(previousNode.type)) {
    return;
  }

  // 병합 전 이전 노드 내용 길이 저장 (커서 위치 계산용)
  const prevContentLength = (previousNode.content || '').length;

  // 현재 노드 내용 가져오기
  const currentContent = currentNode.content || '';

  // 이전 노드에 현재 노드 내용 병합
  previousNode.content = (previousNode.content || '') + currentContent;

  // 현재 노드 삭제
  nodes.value.splice(index, 1);
  saveNotes();

  // 이전 노드에 포커스 설정, 커서는 병합 지점에 위치
  setTimeout(() => {
    nextTick(() => {
      try {
        // 삭제 후 이전 노드에 포커스 설정 (인덱스가 1 감소)
        const nodeRef = nodeRefs.value[index - 1];
        if (!nodeRef) return;

        // 포커스 설정 시도
        if (typeof nodeRef.focus === 'function') {
          // 먼저 포커스 설정 - custom 위치는 나중에 직접 설정
          nodeRef.focus({
            position: 'custom',
            scrollIntoView: true
          });

          // 포커스 설정 후 커서 위치를 병합 지점으로 정확히 설정
          // 추가 지연으로 DOM 갱신 확실히 보장
          setTimeout(() => {
            try {
              if (nodeRef.inputRef) {
                const selection = window.getSelection();
                if (selection) {
                  // 먼저 모든 내용 선택 후 이동
                  const range = document.createRange();
                  range.selectNodeContents(nodeRef.inputRef);

                  // 병합 지점으로 이동하기 위해 collapse
                  // 이전 노드의 원래 내용 길이 위치로 이동
                  const textNodes = Array.from<Node>(nodeRef.inputRef.childNodes)
                    .filter((node): node is Text =>
                      node.nodeType === Node.TEXT_NODE);

                  if (textNodes.length > 0) {
                    // 텍스트 노드가 있으면 계산된 위치에 설정
                    let remainingOffset = prevContentLength;
                    let targetNode: Node | null = null;
                    let targetOffset = 0;

                    // 텍스트 노드들을 순회하며 올바른 위치 찾기
                    for (const textNode of textNodes) {
                      if (remainingOffset <= textNode.length) {
                        targetNode = textNode;
                        targetOffset = remainingOffset;
                        break;
                      }
                      remainingOffset -= textNode.length;
                    }

                    if (targetNode) {
                      range.setStart(targetNode, targetOffset);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    } else {
                      // 마지막 위치로 이동
                      range.collapse(false);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    }
                  } else {
                    // 텍스트 노드가 없으면 내용의 시작에 위치
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                }
              }
            } catch (error) {
              console.error('커서 위치 설정 오류:', error);

              // 백업 시도 - 그냥 노드에 포커스만이라도 설정
              try {
                nodeRef.focus({ position: 'end' });
              } catch (e) {
                console.error('백업 포커스 설정 실패:', e);
              }
            }
          }, 20);
        }
      } catch (error) {
        console.error('노드 병합 후 포커스 설정 오류:', error);
      }
    });
  }, 75); // 충분한 지연으로 DOM 업데이트 보장
}

// 드롭 이벤트 처리 (드래그 앤 드롭)
function handleDrop(event: DragEvent) {
  if (!event.dataTransfer) return;

  const sourceId = event.dataTransfer.getData('text/plain');
  if (!sourceId) return;

  // 드롭 위치에 가장 가까운 노드 찾기
  const dropY = event.clientY;
  const sourceIndex = nodes.value.findIndex(n => n.id === sourceId);
  if (sourceIndex === -1) return;

  const sourceNode = nodes.value[sourceIndex];
  if (!sourceNode) return;

  // 각 노드 요소의 위치 확인
  const nodeElements = Array.from(document.querySelectorAll('.node-wrapper'));
  let targetIndex = sourceIndex;
  let minDistance = Number.MAX_VALUE;

  nodeElements.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const distance = Math.abs(dropY - centerY);

    if (distance < minDistance) {
      minDistance = distance;
      targetIndex = i;
    }
  });

  // 자기 자신에게 드롭한 경우 무시
  if (targetIndex === sourceIndex) return;

  // 노드 이동
  const nodeToMove = { ...sourceNode } as NoteNode;
  nodes.value.splice(sourceIndex, 1);
  nodes.value.splice(targetIndex, 0, nodeToMove);
  saveNotes();

  // 이동된 노드에 포커스
  nextTick(() => {
    const nodeRef = nodeRefs.value[targetIndex];
    if (nodeRef && typeof nodeRef.focus === 'function') {
      nodeRef.focus({
        position: 'start',
        scrollIntoView: true
      });
    }
  });
}

// 노트 영역 외부 클릭 시 빈 노드 정리
function handleBackgroundClick(event: MouseEvent) {
  // 노드 내부 클릭은 무시
  if ((event.target as Element).closest('.node-wrapper')) {
    return;
  }

  // 연속된 빈 노드 정리
  if (nodes.value.length > 1) {
    const cleanedNodes = [...nodes.value];
    let hasChanges = false;

    // 뒤에서부터 검사 (인덱스 변화 방지)
    for (let i = cleanedNodes.length - 1; i > 0; i--) {
      const currentNode = cleanedNodes[i];
      const prevNode = cleanedNodes[i-1];

      if (!currentNode || !prevNode) continue;

      // 연속된 빈 텍스트 노드 제거
      if (
        currentNode.type === 'text' &&
        !currentNode.content?.trim() &&
        prevNode.type === 'text' &&
        !prevNode.content?.trim()
      ) {
        cleanedNodes.splice(i, 1);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      nodes.value = cleanedNodes;
      saveNotes();
    }
  }

  // 노드가 하나도 없으면 기본 노드 추가
  if (nodes.value.length === 0) {
    addEmptyNode();
  }
}

// =============== 노드 계층 관리 ===============

// 노드 계층 레벨 설정
function setNodeLevel(nodeId: string, level: number) {
  nodeLevels.value[nodeId] = level;
}

// 노드 계층 레벨 가져오기
function getNodeLevel(node: NoteNode): number {
  return nodeLevels.value[node.id] || 0;
}

// 노드 부모 설정
function setNodeParent(nodeId: string, parentId: string | null) {
  nodeParents.value[nodeId] = parentId;
}

// 자식 노드 여부 확인
function hasChildren(node: NoteNode): boolean {
  // 임시로 항상 false 반환 (계층 구조 미구현)
  return false;
}

// =============== 저장 및 로드 ===============

// 노트 저장
function saveNotes() {
  try {
    const noteData = {
      nodes: nodes.value,
      title: pageTitle.value,
      nodeLevels: nodeLevels.value,
      nodeParents: nodeParents.value,
      lastModified: new Date().toISOString()
    };

    localStorage.setItem('noteData', JSON.stringify(noteData));
  } catch (error) {
    console.error('노트 저장 오류:', error);
  }
}

// 페이지 제목 저장
function savePage() {
  localStorage.setItem('pageTitle', pageTitle.value);
}

// 노트 로드
function loadNotes() {
  try {
    // 노트 데이터 로드
    const noteDataStr = localStorage.getItem('noteData');
    if (noteDataStr) {
      const noteData = JSON.parse(noteDataStr);

      // 노드 데이터 로드
      nodes.value = noteData.nodes || [];

      // 노드 계층 정보 로드
      nodeLevels.value = noteData.nodeLevels || {};
      nodeParents.value = noteData.nodeParents || {};

      // 페이지 제목 로드
      pageTitle.value = noteData.title || '제목 없음';
    } else {
      // 기존 방식의 데이터가 있는지 확인 (하위 호환성)
      const savedNotes = localStorage.getItem('notes');
      const savedTitle = localStorage.getItem('pageTitle');

      if (savedTitle) {
        pageTitle.value = savedTitle;
      }

      if (savedNotes) {
        try {
          const parsed = JSON.parse(savedNotes);
          if (Array.isArray(parsed)) {
            nodes.value = parsed;
          } else {
            // 하나의 기본 노드로 시작
            nodes.value = [createDefaultNode()];
          }
        } catch (e) {
          // 하나의 기본 노드로 시작
          nodes.value = [createDefaultNode()];
        }
      } else {
        // 하나의 기본 노드로 시작 - 최초 실행 시
        nodes.value = [createDefaultNode()];
      }
    }

    // 로드된 데이터가 없거나 빈 배열이면 하나의 기본 노드만 추가
    if (nodes.value.length === 0) {
      nodes.value = [createDefaultNode()];
    }

    // 불필요한 노드 제거 - 앱 최초 실행 시 빈 노드 하나만 표시
    // 지역 변수로 첫 실행 여부 확인 (localStorage에 어떤 데이터도 없음)
    const isFirstRun = !noteDataStr && !localStorage.getItem('notes') && !localStorage.getItem('pageTitle');

    if (isFirstRun) {
      // 최초 실행 시 빈 노드 하나만 표시
      nodes.value = [createDefaultNode()];
    } else {
      // 모든 노드가 비어있는 경우에도 하나만 유지 (사용자가 모든 내용 삭제한 경우)
      const allEmpty = nodes.value.every(node => !node.content || !node.content.trim());
      if (allEmpty && nodes.value.length > 1) {
        nodes.value = [createDefaultNode()];
      }
    }

    // 초기 저장 (필요시)
    if (isFirstRun) {
      saveNotes();
    }
  } catch (error) {
    console.error('노트 로드 오류:', error);
    nodes.value = [createDefaultNode()];
    saveNotes(); // 오류 발생 시에도 기본 상태 저장
  }
}
</script>

<style scoped>
.notes-page {
  background-color: #ffffff;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 0;
}

.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 24px 120px;
}

.title-section {
  margin-bottom: 30px;
}

.page-title-input {
  font-size: 40px;
  font-weight: 700;
  color: rgb(55, 53, 47);
  line-height: 1.2;
  padding: 0;
}

.page-title-input :deep(.q-field__native) {
  padding: 0;
  color: rgb(55, 53, 47);
}

.page-title-input :deep(.q-field__control) {
  height: auto;
}

.notes-section {
  position: relative;
  padding-bottom: 60px;
  min-height: 300px;
}

.nodes-container {
  margin-left: 24px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  color: rgba(55, 53, 47, 0.5);
}

.empty-text {
  font-size: 15px;
  line-height: 1.6;
}

.empty-text p {
  margin: 8px 0;
}

.empty-text a {
  color: #2383e2;
  text-decoration: none;
}

.empty-text a:hover {
  text-decoration: underline;
}

/* 반응형 */
@media (max-width: 600px) {
  .container {
    padding: 30px 16px 80px;
  }

  .page-title-input {
    font-size: 32px;
  }

  .nodes-container {
    margin-left: 12px;
  }
}
</style>
