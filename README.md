# 현담비 노트 (Hynndambi Note)

현담비 노트는 Quasar Framework 2를 기반으로 한 모던 노트 애플리케이션입니다. 다양한 타입의 노드를 지원하며, 확장 가능한 구조로 설계되었습니다.

## 주요 기능

- 직관적인 노트 관리 및 편집
- 다양한 기본 노드 타입 지원 (텍스트, 제목, 투두, 코드 등)
- 확장 노드 시스템 (내부 및 외부 확장 지원)
- 드래그 앤 드롭으로 노드 순서 변경
- 마크다운 렌더링 지원

## 시작하기

### 필수 조건

- Node.js 14.0.0 이상
- Yarn 또는 NPM

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/hynndambi-note.git

# 디렉토리 이동
cd hynndambi-note

# 의존성 설치
yarn install
# 또는
npm install

# 개발 서버 실행
yarn dev
# 또는
npm run dev
```

## 확장 노드 시스템

현담비 노트는 강력한 확장 노드 시스템을 제공합니다. 이를 통해 사용자는 기본 노드 타입 외에도 다양한 기능을 가진 확장 노드를 추가할 수 있습니다.

### 확장 노드 사용하기

1. **슬래시 메뉴를 통한 노드 추가**
   - 노트 편집 중 빈 줄에서 `/` 키를 입력하면 슬래시 메뉴가 나타납니다.
   - 메뉴에서 원하는 노드 타입을 선택하세요.
   - 기본 노드 외에도 설치된 확장 노드들이 함께 표시됩니다.

2. **확장 노드 관리**
   - 상단 메뉴의 '확장 노드 관리' 페이지에서 설치된 확장 노드를 확인할 수 있습니다.
   - 새로운 확장 노드를 추가하거나 기존 확장 노드를 삭제할 수 있습니다.
   - 내부 확장과 외부 확장을 구분하여 관리합니다.

### 기본 제공 확장 노드

현담비 노트는 다음과 같은 외부 확장 노드를 기본 제공합니다:

1. **차트 노드**: 데이터를 시각화하는 차트를 생성합니다.
2. **비디오 노드**: YouTube, Vimeo 등의 동영상을 노트에 삽입합니다.
3. **날씨 노드**: 도시별 날씨 정보를 표시합니다.
4. **지도 노드**: 지도를 추가하고 위치를 표시합니다.
5. **캘린더 노드**: 일정과 날짜 정보를 노트에 추가합니다.

### 외부 확장 노드 개발 가이드

자신만의 외부 확장 노드를 개발하려면 다음 지침을 따르세요:

1. **확장 노드 구조**

외부 확장 노드는 다음과 같은 구조로 JavaScript 파일을 작성해야 합니다:

```javascript
(function(Vue, ExtensionManager) {
  // 확장 노드 정의
  const extensionDefinition = {
    id: 'unique-node-id',
    type: 'node-type', // 고유한 노드 타입
    name: '노드 이름',
    description: '노드 설명',
    icon: 'icon-name', // Material 아이콘 이름
    color: '#HEXCOLOR',
    version: '1.0.0',
    author: '개발자 이름'
  };

  // 컴포넌트 템플릿
  const template = `
    <div class="your-node-class">
      <!-- 노드 템플릿 내용 -->
    </div>
  `;

  // CSS 스타일
  const style = `
    .your-node-class {
      /* 스타일 내용 */
    }
  `;

  // 노드 컴포넌트 정의
  const YourNodeComponent = {
    name: 'YourNodeComponent',
    props: {
      node: {
        type: Object,
        required: true
      }
    },
    emits: ['update'],
    setup(props) {
      // Vue Composition API 로직
      return {
        // 반환할 값들
      };
    },
    template: template
  };

  // 노드 초기화 함수
  function initializeNode(node) {
    // 노드 초기화 로직
    return {
      ...node,
      type: 'node-type',
      // 기타 초기값
    };
  }

  // CSS 스타일 추가
  const styleElement = document.createElement('style');
  styleElement.textContent = style;
  document.head.appendChild(styleElement);

  // 확장 노드 등록
  ExtensionManager.registerExtension(
    extensionDefinition,
    {
      name: 'YourNodeComponent',
      nodeType: 'node-type',
      initialize: initializeNode,
      component: YourNodeComponent
    }
  );

  console.log('확장 노드가 로드되었습니다.');
})(Vue, ExtensionManager);
```

2. **설치 방법**

개발한 확장 노드는 다음 방법으로 설치할 수 있습니다:

- **로컬 파일로 설치**: 확장 관리자에서 '로컬 파일에서 설치' 옵션을 선택하고 JS 파일을 선택합니다.
- **URL로 설치**: 확장 관리자에서 '원격 URL에서 설치' 옵션을 선택하고 JS 파일의 URL을 입력합니다.
- **샘플 확장 설치**: 기본 제공되는 샘플 확장 중에서 선택합니다.

3. **확장 노드 개발 시 유의사항**

- 모든 확장 노드는 독립적으로 작동해야 합니다.
- 외부 라이브러리에 의존할 경우, 직접 포함시키거나 CDN을 통해 로드해야 합니다.
- 사용자 데이터는 노드의 `metadata` 속성에 저장하는 것이 좋습니다.
- 보안에 주의하고, 안전한 코드만 작성하세요.

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.
