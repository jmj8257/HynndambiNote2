// src/boot/extensions.ts - 확장 노드 관리자 초기화
import { boot } from 'quasar/wrappers';
import extensionManager from 'src/services/ExtensionManager';

// Quasar 부트 파일
export default boot(async ({ app }) => {
  // 확장 노드 관리자 초기화
  console.log('🔌 확장 노드 관리자 초기화 중...');

  try {
    // 확장 노드 관리자 초기화
    await extensionManager.initialize();

    // 애플리케이션에 전역 속성으로 제공
    app.config.globalProperties.$extensionManager = extensionManager;

    console.log('✅ 확장 노드 관리자 초기화 완료');
  } catch (error) {
    console.error('❌ 확장 노드 관리자 초기화 실패:', error);
  }
});
