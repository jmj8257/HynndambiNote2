<template>
  <q-page class="extension-manager-page q-pa-md">
    <div class="container">
      <h1 class="page-title q-my-md">확장 노드 관리</h1>

      <div class="row q-col-gutter-md">
        <!-- 좌측: 탭 패널 및 확장 노드 목록 -->
        <div class="col-12 col-md-8">
          <q-card flat bordered>
            <q-tabs
              v-model="activeTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="justify"
              narrow-indicator
            >
              <q-tab name="internal" label="내부 확장" icon="developer_board" />
              <q-tab name="external" label="외부 확장" icon="cloud_download" />
              <q-tab name="store" label="확장 스토어" icon="shopping_cart" />
            </q-tabs>

            <q-separator />

            <q-tab-panels v-model="activeTab" animated>
              <!-- 내부 확장 노드 탭 -->
              <q-tab-panel name="internal">
                <div class="text-subtitle1 q-mb-md">내부 확장 노드</div>
                <p class="q-mb-md text-grey-8">
                  내부 확장 노드는 애플리케이션과 함께 제공되는 기본 확장 노드입니다.
                </p>

                <div v-if="internalExtensions.length === 0" class="empty-state">
                  <q-icon name="info" size="40px" color="grey-6" />
                  <div class="text-grey-7 q-mt-sm">내부 확장 노드가 없습니다</div>
                </div>

                <div class="row q-col-gutter-md">
                  <div
                    v-for="ext in internalExtensions"
                    :key="ext.type"
                    class="col-12 col-sm-6"
                  >
                    <extension-card
                      :extension="ext"
                      :is-internal="true"
                      @show-preview="showExtensionPreview"
                    />
                  </div>
                </div>
              </q-tab-panel>

              <!-- 외부 확장 노드 탭 -->
              <q-tab-panel name="external">
                <div class="text-subtitle1 q-mb-md">외부 확장 노드</div>
                <p class="q-mb-md text-grey-8">
                  외부 확장 노드는 사용자가 추가로 설치한 확장 노드입니다.
                </p>

                <div class="action-buttons q-mb-md">
                  <q-btn
                    color="primary"
                    icon="add"
                    label="외부 확장 설치"
                    @click="installDialog = true"
                  />
                </div>

                <div v-if="externalExtensions.length === 0" class="empty-state">
                  <q-icon name="info" size="40px" color="grey-6" />
                  <div class="text-grey-7 q-mt-sm">설치된 외부 확장 노드가 없습니다</div>
                  <div class="text-grey-7 q-mt-xs">
                    '외부 확장 설치' 버튼을 클릭하여 외부 확장 노드를 추가하세요
                  </div>
                </div>

                <div class="row q-col-gutter-md">
                  <div
                    v-for="ext in externalExtensions"
                    :key="ext.type"
                    class="col-12 col-sm-6"
                  >
                    <extension-card
                      :extension="ext"
                      :is-internal="false"
                      @delete="confirmDelete(ext)"
                      @show-preview="showExtensionPreview"
                    />
                  </div>
                </div>
              </q-tab-panel>

              <!-- 확장 스토어 탭 -->
              <q-tab-panel name="store">
                <div class="text-subtitle1 q-mb-md">확장 스토어</div>
                <p class="q-mb-md text-grey-8">
                  추가 확장 노드를 탐색하고 설치하세요. 이 페이지에는 사용 가능한 샘플 확장 노드가 표시됩니다.
                </p>

                <div class="row q-col-gutter-md">
                  <div
                    v-for="ext in sampleExtensions"
                    :key="ext.filename"
                    class="col-12 col-sm-6"
                  >
                    <q-card class="extension-card">
                      <q-card-section class="q-pb-none">
                        <div class="row items-center no-wrap">
                          <div class="extension-icon" :style="`background-color: ${ext.color};`">
                            <q-icon :name="ext.icon" size="24px" color="white" />
                          </div>
                          <div class="col">
                            <div class="text-subtitle1 q-ml-sm">{{ ext.name }}</div>
                          </div>
                        </div>
                      </q-card-section>

                      <q-card-section>
                        <p class="text-grey-8">{{ ext.description }}</p>
                      </q-card-section>

                      <q-card-actions align="right">
                        <q-btn
                          color="primary"
                          outline
                          label="설치"
                          @click="installSampleExtension(ext.filename)"
                          :loading="isLoading"
                          :disable="isExtensionInstalled(ext.name)"
                        />
                      </q-card-actions>
                    </q-card>
                  </div>
                </div>
              </q-tab-panel>
            </q-tab-panels>
          </q-card>
        </div>

        <!-- 우측: 도움말 및 통계 -->
        <div class="col-12 col-md-4">
          <!-- 상태 카드 -->
          <q-card class="status-card q-mb-md" flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">확장 노드 상태</div>

              <div class="q-my-sm">
                <div class="row items-center">
                  <div class="col-6">내부 확장:</div>
                  <div class="col-6 text-right">{{ internalExtensions.length }}개</div>
                </div>
                <div class="row items-center">
                  <div class="col-6">외부 확장:</div>
                  <div class="col-6 text-right">{{ externalExtensions.length }}개</div>
                </div>
                <div class="row items-center">
                  <div class="col-6">총 설치된 확장:</div>
                  <div class="col-6 text-right font-weight-bold">
                    {{ internalExtensions.length + externalExtensions.length }}개
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- 도움말 카드 -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">확장 노드 사용 방법</div>

              <p class="text-grey-8">
                확장 노드는 노트에 다양한 기능을 추가할 수 있는 특별한 블록입니다.
              </p>

              <ol class="text-grey-8 q-ml-md">
                <li>
                  <strong>설치:</strong> 원하는 확장 노드를 '확장 스토어'에서 찾아 설치하거나,
                  외부 URL이나 파일에서 직접 설치할 수 있습니다.
                </li>
                <li>
                  <strong>사용:</strong> 노트 편집 시 슬래시(/) 메뉴에서 설치된 확장 노드를 선택하여 사용할 수 있습니다.
                </li>
                <li>
                  <strong>관리:</strong> 이 페이지에서 설치된 확장 노드를 확인하고 관리할 수 있습니다.
                </li>
              </ol>

              <p class="text-grey-8">
                보안을 위해 신뢰할 수 있는 소스의 확장 노드만 설치하시기 바랍니다.
              </p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- 확장 설치 다이얼로그 -->
    <q-dialog v-model="installDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">외부 확장 노드 설치</div>
        </q-card-section>

        <q-card-section>
          <q-option-group
            v-model="installMethod"
            :options="[
              { label: '원격 URL에서 설치', value: 'url' },
              { label: '로컬 파일에서 설치', value: 'file' },
            ]"
            color="primary"
          />

          <div class="q-mt-md">
            <template v-if="installMethod === 'url'">
              <q-input
                v-model="externalUrl"
                label="확장 노드 URL"
                outlined
                dense
                :rules="[val => !!val || 'URL을 입력하세요']"
              >
                <template v-slot:prepend>
                  <q-icon name="link" />
                </template>
              </q-input>
              <div class="text-caption q-mt-sm text-grey-7">
                JavaScript 파일의 URL을 입력하세요. (예: https://example.com/extensions/my-extension.js)
              </div>
            </template>
            <template v-else>
              <q-file
                v-model="fileInput"
                label="확장 노드 파일 선택"
                outlined
                dense
                accept=".js"
                :rules="[val => !!val || '파일을 선택하세요']"
              >
                <template v-slot:prepend>
                  <q-icon name="attach_file" />
                </template>
              </q-file>
              <div class="text-caption q-mt-sm text-grey-7">
                JavaScript (.js) 파일만 지원됩니다.
              </div>
            </template>
          </div>

          <div v-if="lastError" class="text-negative q-mt-md">
            <q-icon name="warning" /> {{ lastError }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="negative" v-close-popup />
          <q-btn
            flat
            label="설치"
            color="primary"
            @click="installExtension"
            :loading="isLoading"
            :disable="installMethod === 'url' ? !externalUrl : !fileInput"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 확장 삭제 확인 다이얼로그 -->
    <q-dialog v-model="deleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="delete" color="negative" text-color="white" />
          <span class="q-ml-sm">확장 노드 삭제</span>
        </q-card-section>

        <q-card-section>
          <p>
            '{{ selectedExtension?.name }}' 확장 노드를 삭제하시겠습니까?
          </p>
          <p class="text-grey-8">
            이 작업은 되돌릴 수 없으며, 해당 확장 노드를 사용하는 기존 노트에 영향을 줄 수 있습니다.
          </p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="primary" v-close-popup />
          <q-btn
            flat
            label="삭제"
            color="negative"
            @click="deleteExtension"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 확장 프리뷰 다이얼로그 -->
    <q-dialog v-model="previewDialog">
      <q-card style="width: 700px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">확장 노드 미리보기</div>
        </q-card-section>

        <q-separator />

        <q-card-section class="preview-container" v-if="selectedExtension">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-4">
              <div class="preview-info">
                <div
                  class="preview-icon q-mb-md"
                  :style="`background-color: ${selectedExtension.color};`"
                >
                  <q-icon :name="selectedExtension.icon" size="48px" color="white" />
                </div>

                <div class="text-h6">{{ selectedExtension.name }}</div>
                <div class="text-subtitle2 q-mb-md">{{ selectedExtension.description }}</div>

                <q-list dense bordered>
                  <q-item>
                    <q-item-section>유형</q-item-section>
                    <q-item-section class="text-right">{{ selectedExtension.isExternal ? '외부' : '내부' }}</q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>버전</q-item-section>
                    <q-item-section class="text-right">{{ selectedExtension.version }}</q-item-section>
                  </q-item>
                  <q-item v-if="selectedExtension.author">
                    <q-item-section>제작자</q-item-section>
                    <q-item-section class="text-right">{{ selectedExtension.author }}</q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
            <div class="col-12 col-sm-8">
              <div class="preview-content">
                <div class="text-subtitle1 q-mb-sm">샘플 노드</div>

                <div class="node-preview-placeholder">
                  <div class="text-grey text-center">
                    여기에 샘플 노드가 표시됩니다.<br />
                    (프리뷰 기능 개발 예정)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="닫기" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import extensionManager from 'src/services/ExtensionManager';
import { ExtensionNodeDefinition } from 'src/models/ExtensionNode';
import { useRouter } from 'vue-router';

// Quasar 유틸리티
const $q = useQuasar();
const router = useRouter();

// 탭 상태
const activeTab = ref('internal');

// 다이얼로그 상태
const installDialog = ref(false);
const deleteDialog = ref(false);
const previewDialog = ref(false);
const isLoading = ref(false);
const lastError = computed(() => extensionManager.lastError.value);
const externalUrl = ref('');
const selectedExtension = ref<ExtensionNodeDefinition | null>(null);

const installMethod = ref('url');
const fileInput = ref<File | null>(null);
const availableLocalExtensions = ref<string[]>([]); // 로컬 확장 노드 파일 목록

// 확장 노드 목록
const internalExtensions = computed(() => extensionManager.internalExtensions.value);
const externalExtensions = computed(() => extensionManager.externalExtensions.value);

// 샘플 확장 노드 목록
const sampleExtensions = ref([
  {
    name: '차트 노드',
    description: '데이터를 시각화하는 차트를 생성합니다',
    filename: 'chart-node.js',
    icon: 'bar_chart',
    color: '#E91E63'
  },
  {
    name: '동영상 노드',
    description: 'YouTube, Vimeo 등의 동영상을 노트에 삽입합니다',
    filename: 'video-node.js',
    icon: 'videocam',
    color: '#FF5252'
  },
  {
    name: '날씨 노드',
    description: '도시별 날씨 정보를 표시합니다',
    filename: 'weather-node.js',
    icon: 'cloud',
    color: '#2196F3'
  },
  {
    name: '지도 노드',
    description: '지도를 추가하고 위치를 표시합니다',
    filename: 'map-node.js',
    icon: 'place',
    color: '#4CAF50'
  },
  {
    name: '캘린더 노드',
    description: '일정과 날짜 정보를 노트에 추가합니다',
    filename: 'calendar-node.js',
    icon: 'event',
    color: '#FF9800'
  }
]);

// 확장 노드가 이미 설치되어 있는지 확인
function isExtensionInstalled(name: string): boolean {
  return [
    ...extensionManager.internalExtensions.value,
    ...extensionManager.externalExtensions.value
  ].some(ext => ext.name.toLowerCase() === name.toLowerCase());
}

// 컴포넌트 초기화
onMounted(async () => {
  await extensionManager.initialize();
});

// 외부 확장 노드 설치
async function installExtension() {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    let success = false;

    if (installMethod.value === 'url') {
      // URL에서 설치
      if (!externalUrl.value) {
        $q.notify({
          message: 'URL을 입력하세요',
          color: 'negative',
          position: 'top',
          timeout: 2000
        });
        isLoading.value = false;
        return;
      }

      success = await extensionManager.loadExternalExtension(externalUrl.value);
    } else {
      // 로컬 파일에서 설치
      if (!fileInput.value) {
        $q.notify({
          message: '파일을 선택하세요',
          color: 'negative',
          position: 'top',
          timeout: 2000
        });
        isLoading.value = false;
        return;
      }

      const file = fileInput.value;
      const reader = new FileReader();

      success = await new Promise<boolean>((resolve) => {
        reader.onload = async (e) => {
          const content = e.target?.result as string;

          // 임시 URL 생성 (메모리에만 존재)
          const blob = new Blob([content], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);

          try {
            // 확장 노드 로드
            const result = await extensionManager.loadExternalExtension(url);
            resolve(result);
          } catch (error) {
            console.error('확장 노드 로드 오류:', error);
            resolve(false);
          } finally {
            // 임시 URL 해제
            URL.revokeObjectURL(url);
          }
        };

        reader.onerror = () => {
          resolve(false);
        };

        reader.readAsText(file);
      });
    }

    if (success) {
      $q.notify({
        message: '확장 노드가 성공적으로 설치되었습니다',
        color: 'positive',
        position: 'top',
        timeout: 2000
      });

      // 다이얼로그 닫기 및 입력 초기화
      installDialog.value = false;
      externalUrl.value = '';
      fileInput.value = null;

      // 외부 확장 탭으로 이동
      activeTab.value = 'external';
    } else {
      $q.notify({
        message: '확장 노드 설치 실패: ' + (extensionManager.lastError.value || '알 수 없는 오류'),
        color: 'negative',
        position: 'top',
        timeout: 3000
      });
    }
  } catch (error) {
    console.error('확장 노드 설치 오류:', error);
    $q.notify({
      message: '확장 노드 설치 중 오류가 발생했습니다',
      color: 'negative',
      position: 'top',
      timeout: 2000
    });
  } finally {
    isLoading.value = false;
  }
}

// 샘플 확장 노드 설치
async function installSampleExtension(filename: string) {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // 외부 확장 노드 디렉토리 경로
    const url = `/external_extension_nodes/${filename}`;

    const success = await extensionManager.loadExternalExtension(url);

    if (success) {
      $q.notify({
        message: '샘플 확장 노드가 성공적으로 설치되었습니다',
        color: 'positive',
        position: 'top',
        timeout: 2000
      });

      // 외부 확장 탭으로 이동
      activeTab.value = 'external';
    } else {
      $q.notify({
        message: '샘플 확장 노드 설치 실패: ' + (extensionManager.lastError.value || '알 수 없는 오류'),
        color: 'negative',
        position: 'top',
        timeout: 3000
      });
    }
  } catch (error) {
    console.error('샘플 확장 노드 설치 오류:', error);
    $q.notify({
      message: '샘플 확장 노드 설치 중 오류가 발생했습니다',
      color: 'negative',
      position: 'top',
      timeout: 2000
    });
  } finally {
    isLoading.value = false;
  }
}

// 확장 노드 삭제 확인
function confirmDelete(extension: ExtensionNodeDefinition) {
  selectedExtension.value = extension;
  deleteDialog.value = true;
}

// 확장 노드 삭제
function deleteExtension() {
  if (!selectedExtension.value) return;

  try {
    // 외부 확장 노드 등록 해제
    extensionManager.unregisterExtension(selectedExtension.value.type);

    // 외부 확장 노드 소스 목록에서 제거
    if (selectedExtension.value.metadata?.source) {
      extensionManager.removeExternalExtension(selectedExtension.value.metadata.source);
    }

    $q.notify({
      message: `'${selectedExtension.value.name}' 확장 노드가 삭제되었습니다`,
      color: 'positive',
      position: 'top',
      timeout: 2000
    });

    selectedExtension.value = null;
  } catch (error) {
    console.error('확장 노드 삭제 오류:', error);
    $q.notify({
      message: '확장 노드 삭제 중 오류가 발생했습니다',
      color: 'negative',
      position: 'top',
      timeout: 2000
    });
  }
}

// 확장 노드 미리보기
function showExtensionPreview(extension: ExtensionNodeDefinition) {
  selectedExtension.value = extension;
  previewDialog.value = true;
}
</script>

<script lang="ts">
// 확장 노드 카드 컴포넌트
import { defineComponent, PropType } from 'vue';
// ExtensionNodeDefinition을 중복 임포트하지 않고 PropType만 사용합니다
// import { ExtensionNodeDefinition } from 'src/models/ExtensionNode';

export const ExtensionCard = defineComponent({
  name: 'ExtensionCard',
  props: {
    extension: {
      type: Object as PropType<ExtensionNodeDefinition>,
      required: true
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  },
  emits: ['delete', 'show-preview'],
  setup(props, { emit }) {
    return {
      deleteExtension() {
        emit('delete', props.extension);
      },
      showPreview() {
        emit('show-preview', props.extension);
      }
    };
  },
  template: `
    <q-card class="extension-card">
      <q-card-section class="q-pb-none">
        <div class="row items-center no-wrap">
          <div class="extension-icon" :style="'background-color: ' + extension.color + ';'">
            <q-icon :name="extension.icon" size="24px" color="white" />
          </div>
          <div class="col">
            <div class="text-subtitle1 q-ml-sm">{{ extension.name }}</div>
          </div>
          <div>
            <q-btn flat round dense icon="more_vert">
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="showPreview">
                    <q-item-section>세부 정보</q-item-section>
                  </q-item>
                  <q-item v-if="!isInternal" clickable v-close-popup @click="deleteExtension">
                    <q-item-section>삭제</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <p class="text-grey-8">{{ extension.description }}</p>
        <div class="text-caption text-grey-7">
          버전: {{ extension.version }}
          <span v-if="extension.author"> • 제작자: {{ extension.author }}</span>
          <span v-if="!isInternal" class="external-badge">외부</span>
        </div>
      </q-card-section>
    </q-card>
  `
});

// 컴포넌트 등록
export default {
  components: {
    ExtensionCard
  }
};
</script>

<style lang="scss" scoped>
.extension-manager-page {
  min-height: 100vh;
  padding-bottom: 60px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  text-align: center;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
}

.extension-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.node-preview-placeholder {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  background-color: #f9f9f9;
}

.external-badge {
  display: inline-block;
  background-color: #673ab7;
  color: white;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 5px;
  font-weight: bold;
}

::v-deep(.extension-card) {
  height: 100%;
}

::v-deep(.q-card) {
  transition: box-shadow 0.3s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
}

@media (max-width: 599px) {
  .page-title {
    font-size: 24px;
  }
}
</style>
