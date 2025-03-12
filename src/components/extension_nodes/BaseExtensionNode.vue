<template>
  <div class="extension-node-wrapper">
    <!-- 확장 노드 타입에 따른 사용자 정의 컨텐츠 -->
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { NoteNode } from 'src/models/NoteNode';

export default defineComponent({
  name: 'BaseExtensionNode',

  props: {
    node: {
      type: Object as PropType<NoteNode>,
      required: true
    }
  },

  setup(props, { emit }) {
    // 노드 데이터 변경 시 상위 컴포넌트에 알림
    const emitUpdate = (updatedNode: NoteNode) => {
      emit('update', updatedNode);
    };

    return {
      emitUpdate
    };
  }
});
</script>

<style scoped>
.extension-node-wrapper {
  margin: 8px 0;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.extension-node-wrapper:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
</style>
