// video-node.js - 동영상 임베드 기능을 제공하는 외부 확장 노드
(function(Vue, ExtensionManager) {
  // 비디오 노드 정의
  const extensionDefinition = {
    id: 'video-node',
    type: 'video',
    name: '동영상',
    description: 'YouTube, Vimeo 등의 동영상을 노트에 삽입합니다',
    icon: 'videocam',
    color: '#FF5252',
    version: '1.0.0',
    author: 'External Developer'
  };

  // 비디오 노드 컴포넌트 템플릿
  const template = `
    <div class="video-node">
      <div v-if="videoUrl" class="video-container">
        <iframe :src="embedUrl" frameborder="0" allowfullscreen></iframe>
        <div class="video-controls">
          <q-btn outline color="negative" dense size="sm" icon="delete" @click="removeVideo" label="제거" />
          <q-btn outline color="primary" dense size="sm" icon="edit" @click="changeVideo" label="변경" />
        </div>
      </div>
      <div v-else class="empty-video">
        <div class="video-input">
          <q-input
            v-model="inputUrl"
            label="YouTube나 Vimeo URL을 입력하세요"
            outlined
            dense
            :rules="[val => !!val || '비디오 URL을 입력하세요']"
          >
            <template v-slot:append>
              <q-btn round dense flat icon="add" @click="addVideo" :disable="!inputUrl" />
            </template>
          </q-input>
        </div>
        <div class="video-help">
          <p>지원 형식: YouTube, Vimeo 등의 공유 URL</p>
          <p>예) https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
        </div>
      </div>
    </div>
  `;

  // 비디오 노드 스타일
  const style = `
    .video-node {
      width: 100%;
      margin: 12px 0;
    }
    .video-container {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%; /* 16:9 비율 */
      height: 0;
      overflow: hidden;
      border-radius: 8px;
    }
    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .video-controls {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
    .empty-video {
      padding: 20px;
      border: 2px dashed #ddd;
      border-radius: 4px;
      background-color: #f9f9f9;
    }
    .video-input {
      margin-bottom: 16px;
    }
    .video-help {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
    }
  `;

  // 비디오 노드 메서드
  const methods = {
    // URL을 임베드 URL로 변환
    getEmbedUrl(url) {
      if (!url) return '';

      // YouTube URL 처리
      let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^&]+)/);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }

      // Vimeo URL 처리
      match = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo.com\/([0-9]+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }

      // 그 외의 경우 원본 URL 반환
      return url;
    },

    // 비디오 추가
    addVideo() {
      if (!this.inputUrl) return;

      const updatedNode = { ...this.node };
      updatedNode.metadata = updatedNode.metadata || {};
      updatedNode.metadata.videoUrl = this.inputUrl;

      this.$emit('update', updatedNode);
    },

    // 비디오 제거
    removeVideo() {
      const updatedNode = { ...this.node };
      updatedNode.metadata = updatedNode.metadata || {};
      updatedNode.metadata.videoUrl = '';

      this.$emit('update', updatedNode);
    },

    // 비디오 변경
    changeVideo() {
      this.inputUrl = this.videoUrl;
      this.removeVideo();
    }
  };

  // 비디오 노드 컴포넌트 정의
  const VideoNodeComponent = {
    name: 'VideoNode',
    props: {
      node: {
        type: Object,
        required: true
      }
    },
    emits: ['update'],
    setup(props) {
      const { ref, computed, watch } = Vue;

      // 입력 URL 상태
      const inputUrl = ref('');

      // 노드 메타데이터에서 비디오 URL 가져오기
      const videoUrl = computed(() => {
        return props.node.metadata?.videoUrl || '';
      });

      // URL을 임베드 URL로 변환한 계산 속성
      const embedUrl = computed(() => {
        return methods.getEmbedUrl(videoUrl.value);
      });

      // 상태 초기화
      watch(videoUrl, (newUrl) => {
        if (!newUrl && inputUrl.value) {
          inputUrl.value = '';
        }
      });

      return {
        inputUrl,
        videoUrl,
        embedUrl,
        ...methods
      };
    },
    template: template
  };

  // 노드 초기화 함수
  function initializeNode(node) {
    // 노드가 이미 초기화되어 있는지 확인
    if (node.type === 'video' && node.metadata?.initialized) {
      return node;
    }

    // 기본값으로 노드 초기화
    return {
      ...node,
      type: 'video',
      content: '',
      metadata: {
        ...node.metadata,
        videoUrl: '',
        initialized: true
      }
    };
  }

  // CSS 스타일을 페이지에 추가
  const styleElement = document.createElement('style');
  styleElement.textContent = style;
  document.head.appendChild(styleElement);

  // 확장 노드 등록
  ExtensionManager.registerExtension(
    extensionDefinition,
    {
      name: 'VideoNode',
      nodeType: 'video',
      initialize: initializeNode,
      component: VideoNodeComponent
    }
  );

  console.log('비디오 확장 노드가 로드되었습니다.');
})(Vue, ExtensionManager);
