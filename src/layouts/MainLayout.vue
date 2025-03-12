<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title>현담비 노트</q-toolbar-title>

        <!-- 툴바 오른쪽 액션 버튼들 -->
        <div class="toolbar-actions">
          <!-- 도움말 버튼 -->
          <q-btn flat round dense icon="help_outline" @click="showHelp">
            <q-tooltip>도움말</q-tooltip>
          </q-btn>

          <!-- 설정 버튼 -->
          <q-btn flat round dense icon="settings" @click="showSettings">
            <q-tooltip>설정</q-tooltip>
          </q-btn>

          <!-- 파일 관리 드롭다운 -->
          <q-btn-dropdown flat dense icon="description" label="파일">
            <q-list>
              <q-item clickable v-close-popup @click="downloadMarkdown">
                <q-item-section avatar>
                  <q-icon name="download" />
                </q-item-section>
                <q-item-section>Markdown으로 내보내기</q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="downloadHTML">
                <q-item-section avatar>
                  <q-icon name="code" />
                </q-item-section>
                <q-item-section>HTML로 내보내기</q-item-section>
              </q-item>

              <q-separator />

              <q-item>
                <q-item-section>
                  <q-file
                    v-model="fileInput"
                    accept=".md,.html"
                    label="파일 불러오기"
                    dense
                    outlined
                    @update:model-value="handleFileUpload"
                  >
                    <template v-slot:prepend>
                      <q-icon name="attach_file" />
                    </template>
                  </q-file>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="240"
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item-label header>메뉴</q-item-label>

          <!-- 노트 메뉴 항목 -->
          <q-item clickable to="/" exact>
            <q-item-section avatar>
              <q-icon name="note" />
            </q-item-section>
            <q-item-section>노트</q-item-section>
          </q-item>

          <!-- 확장 프로그램 관리 메뉴 항목 -->
          <q-item clickable to="/extensions">
            <q-item-section avatar>
              <q-icon name="extension" />
            </q-item-section>
            <q-item-section>확장 관리</q-item-section>
          </q-item>

          <q-separator spaced />

          <!-- 최근 문서 섹션 -->
          <q-item-label header>최근 문서</q-item-label>
          <q-item v-if="recentDocuments.length === 0" dense>
            <q-item-section>
              <div class="text-grey-7 text-italic">최근 문서가 없습니다</div>
            </q-item-section>
          </q-item>
          <q-item
            v-for="(doc, index) in recentDocuments"
            :key="index"
            clickable
            @click="loadDocument(doc.id)"
          >
            <q-item-section avatar>
              <q-icon name="article" />
            </q-item-section>
            <q-item-section>
              {{ doc.title || '제목 없음' }}
              <q-item-label caption>{{ formatDate(doc.lastModified) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- 도움말 다이얼로그 -->
    <q-dialog v-model="helpDialog">
      <q-card class="help-dialog">
        <q-card-section>
          <div class="text-h6">도움말</div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-md">
          <p><strong>기본 사용법:</strong></p>
          <ul>
            <li>빈 줄에서 <code>/</code>를 입력하여 슬래시 메뉴를 엽니다</li>
            <li>Enter를 눌러 새 노드를 추가합니다</li>
            <li>Backspace를 눌러 노드를 삭제하거나 이전 노드와 병합합니다</li>
            <li>Tab/Shift+Tab으로 노드를 들여쓰기/내어쓰기합니다</li>
          </ul>
          <p><strong>단축키:</strong></p>
          <ul>
            <li><code>Ctrl/Cmd + S</code>: 현재 노트 저장</li>
            <li><code>Ctrl/Cmd + /</code>: 슬래시 메뉴 열기</li>
            <li><code>Ctrl/Cmd + ↑/↓</code>: 노드 위/아래로 이동</li>
          </ul>
          <p><strong>확장 기능:</strong></p>
          <p>확장 관리 페이지에서 다양한 확장 노드를 추가할 수 있습니다.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="닫기" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 설정 다이얼로그 -->
    <q-dialog v-model="settingsDialog">
      <q-card class="settings-dialog">
        <q-card-section>
          <div class="text-h6">설정</div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-toggle
            v-model="darkMode"
            label="다크 모드"
            @update:model-value="toggleDarkMode"
          />
          <q-toggle
            v-model="autoSave"
            label="자동 저장"
          />
          <q-select
            v-model="defaultNodeType"
            :options="nodeTypeOptions"
            label="기본 노드 타입"
            outlined
            dense
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="negative" v-close-popup />
          <q-btn flat label="저장" color="primary" @click="saveSettings" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import extensionManager from 'src/services/ExtensionManager';

const $q = useQuasar();
const router = useRouter();

// 상태 변수들
const leftDrawerOpen = ref(false);
const helpDialog = ref(false);
const settingsDialog = ref(false);
const fileInput = ref<File | null>(null);

// 설정 관련 상태
const darkMode = ref(false);
const autoSave = ref(true);
const defaultNodeType = ref('text');
const nodeTypeOptions = [
  { label: '텍스트', value: 'text' },
  { label: '할 일', value: 'todo' },
  { label: '제목 1', value: 'heading1' },
  { label: '제목 2', value: 'heading2' },
  { label: '제목 3', value: 'heading3' },
  { label: '글머리 기호', value: 'bullet' },
  { label: '번호 매기기', value: 'numbered' },
  { label: '코드', value: 'code' },
  { label: '인용구', value: 'quote' },
  { label: '구분선', value: 'divider' }
];

// 최근 문서 목록
const recentDocuments = ref<Array<{
  id: string;
  title: string;
  lastModified: string;
}>>([]);

// 컴포넌트 초기화
onMounted(async () => {
  // 확장 프로그램 관리자 초기화
  await extensionManager.initialize();

  // 최근 문서 목록 로드
  loadRecentDocuments();

  // 설정 로드
  loadSettings();
});

// 최근 문서 목록 로드
function loadRecentDocuments() {
  const recentDocsString = localStorage.getItem('recent_documents');
  if (recentDocsString) {
    try {
      recentDocuments.value = JSON.parse(recentDocsString);
    } catch (error) {
      console.error('최근 문서 로드 오류:', error);
      recentDocuments.value = [];
    }
  }
}

// 설정 로드
function loadSettings() {
  const settingsString = localStorage.getItem('app_settings');
  if (settingsString) {
    try {
      const settings = JSON.parse(settingsString);
      darkMode.value = settings.darkMode || false;
      autoSave.value = settings.autoSave !== undefined ? settings.autoSave : true;
      defaultNodeType.value = settings.defaultNodeType || 'text';

      // 다크 모드 적용
      if (darkMode.value) {
        $q.dark.set(true);
      }
    } catch (error) {
      console.error('설정 로드 오류:', error);
    }
  }
}

// 설정 저장
function saveSettings() {
  const settings = {
    darkMode: darkMode.value,
    autoSave: autoSave.value,
    defaultNodeType: defaultNodeType.value
  };

  localStorage.setItem('app_settings', JSON.stringify(settings));

  // 이벤트 발행 (다른 컴포넌트에서 설정 변경 감지 위함)
  window.dispatchEvent(new CustomEvent('app-settings-updated', {
    detail: settings
  }));

  $q.notify({
    message: '설정이 저장되었습니다',
    color: 'positive',
    position: 'top',
    timeout: 1000
  });
}

// 다크 모드 토글
function toggleDarkMode(value: boolean) {
  $q.dark.set(value);
}

// 문서 로드
function loadDocument(id: string) {
  // 미구현: 실제 문서 로드 로직은 추후 구현
  console.log('문서 로드:', id);
  router.push('/');
}

// 파일 업로드 처리
function handleFileUpload(file: File | null) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target?.result as string;

    if (file.name.endsWith('.md')) {
      // 마크다운 파일 처리
      importMarkdown(content);
    } else if (file.name.endsWith('.html')) {
      // HTML 파일 처리
      importHTML(content);
    }
  };

  if (file.name.endsWith('.md') || file.name.endsWith('.html')) {
    reader.readAsText(file);
  } else {
    $q.notify({
      message: '지원하지 않는 파일 형식입니다. (지원: .md, .html)',
      color: 'negative',
      position: 'top',
      timeout: 2000
    });
  }

  // 파일 입력 초기화 (동일 파일 다시 선택 가능하도록)
  fileInput.value = null;
}

// 마크다운 가져오기
function importMarkdown(content: string) {
  // 마크다운을 노드로 변환하는 로직 (단순화 버전)
  localStorage.setItem('import_content', content);
  localStorage.setItem('import_type', 'markdown');

  router.push('/');

  $q.notify({
    message: '마크다운 파일을 가져왔습니다',
    color: 'positive',
    position: 'top',
    timeout: 2000
  });
}

// HTML 가져오기
function importHTML(content: string) {
  // HTML을 노드로 변환하는 로직 (단순화 버전)
  localStorage.setItem('import_content', content);
  localStorage.setItem('import_type', 'html');

  router.push('/');

  $q.notify({
    message: 'HTML 파일을 가져왔습니다',
    color: 'positive',
    position: 'top',
    timeout: 2000
  });
}

// 마크다운으로 내보내기
function downloadMarkdown() {
  // 노드를 마크다운으로 변환하는 로직 (단순화 버전)
  const noteData = localStorage.getItem('noteData');
  if (!noteData) {
    $q.notify({
      message: '내보낼 노트 데이터가 없습니다',
      color: 'negative',
      position: 'top',
      timeout: 2000
    });
    return;
  }

  // 실제로는 여기서 노드 데이터를 마크다운으로 변환
  const markdownContent = '# 현담비 노트\n\n이 파일은 현담비 노트에서 내보낸 마크다운 문서입니다.\n';

  // 다운로드 처리
  downloadFile('hynndambi-note.md', markdownContent, 'text/markdown');
}

// HTML로 내보내기
function downloadHTML() {
  // 노드를 HTML로 변환하는 로직 (단순화 버전)
  const noteData = localStorage.getItem('noteData');
  if (!noteData) {
    $q.notify({
      message: '내보낼 노트 데이터가 없습니다',
      color: 'negative',
      position: 'top',
      timeout: 2000
    });
    return;
  }

  // 실제로는 여기서 노드 데이터를 HTML로 변환
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>현담비 노트</title>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <h1>현담비 노트</h1>
      <p>이 파일은 현담비 노트에서 내보낸 HTML 문서입니다.</p>
    </body>
    </html>
  `;

  // 다운로드 처리
  downloadFile('hynndambi-note.html', htmlContent, 'text/html');
}

// 파일 다운로드 처리
function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);

  $q.notify({
    message: `${filename} 파일이 다운로드되었습니다`,
    color: 'positive',
    position: 'top',
    timeout: 2000
  });
}

// 도움말 표시
function showHelp() {
  helpDialog.value = true;
}

// 설정 표시
function showSettings() {
  settingsDialog.value = true;
}

// 사이드바 토글
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// 날짜 포맷팅
function formatDate(dateString: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return '';
  }
}
</script>

<style lang="scss" scoped>
.toolbar-actions {
  display: flex;
  align-items: center;
}

.help-dialog, .settings-dialog {
  width: 500px;
  max-width: 90vw;

  code {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
  }
}

.dark .help-dialog, .dark .settings-dialog {
  code {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
