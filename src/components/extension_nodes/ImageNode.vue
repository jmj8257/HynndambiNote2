<template>
  <base-extension-node :node="node" @update="$emit('update', $event)">
    <div class="image-node">
      <div v-if="imageUrl" class="image-container">
        <img :src="imageUrl" :alt="altText" @click="showOptions = !showOptions" />

        <div v-if="showOptions" class="image-options">
          <q-btn icon="edit" flat round dense @click="openImageEditor" />
          <q-btn icon="delete" flat round dense @click="removeImage" />
        </div>
      </div>

      <div v-else class="upload-container">
        <q-btn outline color="primary" icon="image" label="이미지 업로드" @click="openImageUpload" />
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileUpload"
        />
      </div>

      <div class="caption-container" v-if="imageUrl">
        <q-input
          v-model="caption"
          placeholder="이미지 설명 입력..."
          dense
          borderless
          @change="updateCaption"
          class="caption-input"
        />
      </div>
    </div>
  </base-extension-node>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed, onMounted } from 'vue';
import { NoteNode } from 'src/models/NoteNode';
import { ExtensionNodeDefinition } from 'src/models/ExtensionNode';
import BaseExtensionNode from './BaseExtensionNode.vue';

// 확장 노드 정의
export const extensionDefinition: ExtensionNodeDefinition = {
  id: 'image-node',
  type: 'image',
  name: '이미지',
  description: '이미지를 추가하고 편집할 수 있습니다',
  icon: 'image',
  color: '#4CAF50',
  isExternal: false,
  version: '1.0.0',
  author: 'System'
};

// 새 이미지 노드 초기화 함수
export function initialize(node: NoteNode): NoteNode {
  return {
    ...node,
    type: 'image',
    content: '',
    metadata: {
      ...node.metadata,
      imageUrl: '',
      caption: '',
      alt: ''
    }
  };
}

export default defineComponent({
  name: 'ImageNode',
  components: { BaseExtensionNode },

  props: {
    node: {
      type: Object as PropType<NoteNode>,
      required: true
    }
  },

  emits: ['update'],

  setup(props, { emit }) {
    const fileInput = ref<HTMLInputElement | null>(null);
    const showOptions = ref(false);

    // 노드 메타데이터에서 이미지 URL 가져오기
    const imageUrl = computed(() => props.node.metadata?.imageUrl || '');

    // 이미지 캡션 상태
    const caption = ref(props.node.metadata?.caption || '');

    // 이미지 대체 텍스트
    const altText = computed(() => props.node.metadata?.alt || caption.value || '이미지');

    // 파일 업로드 버튼 클릭 시 숨겨진 파일 입력 트리거
    const openImageUpload = () => {
      if (fileInput.value) {
        fileInput.value.click();
      }
    };

    // 파일 업로드 처리
    const handleFileUpload = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;

      const file = target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        // 이미지 데이터 URL로 저장
        const updatedNode = {
          ...props.node,
          metadata: {
            ...props.node.metadata,
            imageUrl: e.target?.result as string
          }
        };

        emit('update', updatedNode);
      };

      reader.readAsDataURL(file);
    };

    // 이미지 제거
    const removeImage = () => {
      const updatedNode = {
        ...props.node,
        metadata: {
          ...props.node.metadata,
          imageUrl: ''
        }
      };

      emit('update', updatedNode);
    };

    // 이미지 에디터 열기 (미구현)
    const openImageEditor = () => {
      console.log('이미지 에디터 기능은 아직 구현되지 않았습니다.');
    };

    // 캡션 업데이트
    const updateCaption = () => {
      const updatedNode = {
        ...props.node,
        metadata: {
          ...props.node.metadata,
          caption: caption.value,
          alt: caption.value // 캡션을 대체 텍스트로도 사용
        }
      };

      emit('update', updatedNode);
    };

    return {
      fileInput,
      imageUrl,
      caption,
      altText,
      showOptions,
      openImageUpload,
      handleFileUpload,
      removeImage,
      openImageEditor,
      updateCaption
    };
  }
});
</script>

<style scoped>
.image-node {
  width: 100%;
  margin: 8px 0;
}

.image-container {
  position: relative;
  max-width: 100%;
  display: inline-block;
}

.image-container img {
  max-width: 100%;
  border-radius: 4px;
  cursor: pointer;
}

.image-options {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.upload-container {
  padding: 20px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  text-align: center;
  background-color: #f9f9f9;
}

.caption-container {
  margin-top: 8px;
  font-size: 0.9em;
  color: #555;
}

.caption-input {
  width: 100%;
}
</style>
