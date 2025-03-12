import { NoteNode } from './NoteNode';

/**
 * 확장 노드에 대한 추가 메타데이터
 */
export interface ExtensionNodeMetadata {
  [key: string]: any;
  source?: string; // 외부 확장 노드의 소스 URL
}

/**
 * 확장 노드 정의 인터페이스
 * 확장 노드의 기본 속성과 동작을 정의합니다.
 */
export interface ExtensionNodeDefinition {
  // 필수 속성
  type: string;            // 확장 노드의 고유 타입 식별자 (예: 'chart', 'video')
  name: string;            // 사용자에게 표시되는 확장 노드 이름
  description: string;     // 확장 노드 설명
  icon: string;            // 확장 노드 아이콘 (Material Icons 이름)
  color: string;           // 확장 노드 테마 색상 (HEX 코드)
  version: string;         // 확장 노드 버전

  // 선택적 속성
  author?: string;         // 확장 노드 제작자
  isExternal?: boolean;    // 외부 확장 노드 여부
  metadata?: ExtensionNodeMetadata; // 추가 메타데이터

  // 확장 노드 렌더러와 관련된 함수
  render?: (element: HTMLElement, data: any) => void;  // 확장 노드 렌더링 함수
  initialize?: (element: HTMLElement) => void;         // 초기화 함수
  cleanup?: (element: HTMLElement) => void;            // 정리 함수

  // 확장 노드 편집과 관련된 함수
  getDefaultContent?: () => any;                      // 기본 콘텐츠 반환 함수
  getEditorComponent?: () => any;                     // 편집기 컴포넌트 반환 함수

  // 데이터 처리와 관련된 함수
  serializeData?: (data: any) => string;              // 데이터 직렬화 함수
  deserializeData?: (serialized: string) => any;      // 데이터 역직렬화 함수

  // 마크다운 변환과 관련된 함수
  toMarkdown?: (data: any) => string;                 // 마크다운 변환 함수
  fromMarkdown?: (markdown: string) => any;           // 마크다운에서 데이터로 변환 함수
}

// 확장 노드 등록 정보
export interface ExtensionRegistry {
  [key: string]: ExtensionNodeDefinition;
}

// 확장 노드 컴포넌트 인터페이스
export interface ExtensionNodeComponent {
  // Vue 컴포넌트 이름
  name: string;

  // 노드 타입
  nodeType: string;

  // 노드 초기화 함수 (새 노드 생성 시 호출)
  initialize: (node: NoteNode) => NoteNode;

  // 노드 렌더링 컴포넌트
  component: any;
}
