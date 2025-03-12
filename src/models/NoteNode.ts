// src/models/NoteNode.ts
// 기본 노드 타입
export type BasicNodeType = 'text' | 'todo' | 'heading' | 'bullet' | 'numbered' | 'quote' | 'code' | 'divider';

// 노드 타입 (기본 + 확장)
export type NodeType = BasicNodeType | string;

export interface NoteNode {
  id: string;
  type: NodeType;
  content: string;
  children?: NoteNode[];
  parentId?: string;
  links?: string[];
  // 메타데이터 확장
  metadata?: {
    checked?: boolean;
    level?: number;
    language?: string;
    extensionId?: string; // 확장 노드일 경우 확장 ID
    extensionData?: any;  // 확장 노드별 커스텀 데이터
    [key: string]: any;   // 기타 확장 메타데이터
  };
}

export interface NoteDocument {
  nodes: NoteNode[];
  rootId: string;
}
