// map-node.js - 지도를 표시하는 외부 확장 노드
(function(Vue, ExtensionManager) {
  // 지도 노드 정의
  const extensionDefinition = {
    id: 'map-node',
    type: 'map',
    name: '지도',
    description: '지도를 추가하고 위치를 표시합니다',
    icon: 'place',
    color: '#4CAF50',
    version: '1.0.0',
    author: 'External Developer'
  };

  // 지도 노드 컴포넌트 템플릿
  const template = `
    <div class="map-node">
      <div v-if="hasLocation" class="map-container">
        <div class="map-header">
          <div class="location-info">
            <q-icon name="place" color="red" />
            <span>{{ locationName }}</span>
          </div>
          <div class="map-actions">
            <q-btn flat dense round icon="edit" @click="editLocation" />
            <q-btn flat dense round icon="delete" @click="removeLocation" />
          </div>
        </div>
        <div class="map-frame">
          <iframe
            width="100%"
            height="300"
            frameborder="0"
            style="border:0"
            :src="mapUrl"
            allowfullscreen
          ></iframe>
        </div>
        <div class="map-footer">
          <span class="coordinates text-caption">{{ coordinates }}</span>
        </div>
      </div>

      <div v-else class="map-empty">
        <div class="location-input">
          <q-input
            v-model="locationInput"
            label="검색할 장소"
            placeholder="서울 강남구, 도쿄 시부야, 에펠탑 등"
            outlined
            dense
            :rules="[val => !!val || '위치를 입력하세요']"
          >
            <template v-slot:append>
              <q-btn round dense flat icon="search" @click="searchLocation" :disable="!locationInput" />
            </template>
          </q-input>
        </div>

        <div class="or-divider">
          <span class="text-caption text-grey">또는</span>
        </div>

        <div class="coordinates-input">
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="latInput"
                label="위도"
                type="number"
                outlined
                dense
                placeholder="예: 37.5665"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="lngInput"
                label="경도"
                type="number"
                outlined
                dense
                placeholder="예: 126.9780"
              />
            </div>
          </div>
          <q-btn
            color="primary"
            label="좌표로 지도 추가"
            class="full-width q-mt-sm"
            :disable="!isValidCoordinates"
            @click="addCoordinates"
          />
        </div>

        <div class="map-help q-mt-md">
          <p class="text-caption text-grey">도시, 장소명으로 검색하거나 위도/경도 좌표를 직접 입력할 수 있습니다.</p>
        </div>
      </div>
    </div>
  `;

  // 지도 노드 스타일
  const style = `
    .map-node {
      width: 100%;
      margin: 12px 0;
    }
    .map-container {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
      background-color: white;
    }
    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    .location-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .map-frame {
      width: 100%;
      height: 300px;
      background-color: #f5f5f5;
    }
    .map-footer {
      padding: 8px 16px;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid #f0f0f0;
    }
    .coordinates {
      color: #777;
      font-size: 12px;
    }
    .map-empty {
      padding: 20px;
      border: 2px dashed #ddd;
      border-radius: 4px;
      background-color: #f9f9f9;
    }
    .location-input {
      margin-bottom: 16px;
    }
    .or-divider {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 16px 0;
      position: relative;
    }
    .or-divider:before, .or-divider:after {
      content: '';
      position: absolute;
      height: 1px;
      background-color: #e0e0e0;
      width: calc(50% - 20px);
      top: 50%;
    }
    .or-divider:before {
      left: 0;
    }
    .or-divider:after {
      right: 0;
    }
    .map-help {
      text-align: center;
      margin-top: 16px;
    }
  `;

  // 지도 노드 메서드
  const methods = {
    // 위치로 지도 URL 생성
    getMapUrl(placeName, lat, lng) {
      // 좌표가 있으면 좌표 사용, 아니면 장소 이름 사용
      if (lat && lng) {
        return `https://www.google.com/maps/embed/v1/view?key=YOUR_API_KEY&center=${lat},${lng}&zoom=14`;
      } else if (placeName) {
        // 장소 이름으로 검색 (실제로는 API 키 필요)
        return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(placeName)}`;
      }

      // 기본값 - 서울
      return `https://www.google.com/maps/embed/v1/view?key=YOUR_API_KEY&center=37.5665,126.9780&zoom=12`;
    },

    // 위치 검색
    searchLocation() {
      if (!this.locationInput) return;

      // 이 예제에서는 실제 API 호출 없이 모의 데이터를 사용합니다
      // 실제 구현에서는 지오코딩 API를 사용해야 합니다
      const mockData = {
        '서울': { lat: 37.5665, lng: 126.9780 },
        '도쿄': { lat: 35.6762, lng: 139.6503 },
        '뉴욕': { lat: 40.7128, lng: -74.0060 },
        '런던': { lat: 51.5074, lng: -0.1278 },
        '파리': { lat: 48.8566, lng: 2.3522 },
        '에펠탑': { lat: 48.8584, lng: 2.2945 }
      };

      let lat = 0;
      let lng = 0;
      let locationName = this.locationInput;

      // 검색어에 포함된 지명 찾기
      for (const place in mockData) {
        if (this.locationInput.toLowerCase().includes(place.toLowerCase())) {
          lat = mockData[place].lat;
          lng = mockData[place].lng;
          locationName = place; // 간단히 검색된 지명을 사용
          break;
        }
      }

      // 찾은 위치가 없을 경우, 기본 위치(서울) 사용
      if (lat === 0 && lng === 0) {
        lat = 37.5665;
        lng = 126.9780;
        locationName = this.locationInput; // 사용자 입력 유지
      }

      this.updateNodeLocation(locationName, lat, lng);
    },

    // 좌표로 지도 추가
    addCoordinates() {
      if (!this.isValidCoordinates) return;

      const lat = parseFloat(this.latInput);
      const lng = parseFloat(this.lngInput);
      const locationName = `위도 ${lat}, 경도 ${lng}`;

      this.updateNodeLocation(locationName, lat, lng);
    },

    // 노드 위치 정보 업데이트
    updateNodeLocation(name, lat, lng) {
      const updatedNode = { ...this.node };
      updatedNode.metadata = updatedNode.metadata || {};
      updatedNode.metadata.mapData = {
        locationName: name,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString()
      };

      this.$emit('update', updatedNode);
    },

    // 위치 정보 편집
    editLocation() {
      if (!this.hasLocation) return;

      this.locationInput = this.locationName;
      this.latInput = this.latitude.toString();
      this.lngInput = this.longitude.toString();

      // 지도 초기화
      const updatedNode = { ...this.node };
      updatedNode.metadata = updatedNode.metadata || {};
      updatedNode.metadata.mapData = null;

      this.$emit('update', updatedNode);
    },

    // 위치 제거
    removeLocation() {
      if (!this.hasLocation) return;

      // 지도 데이터 초기화
      const updatedNode = { ...this.node };
      updatedNode.metadata = updatedNode.metadata || {};
      updatedNode.metadata.mapData = null;

      this.$emit('update', updatedNode);
    }
  };

  // 지도 노드 컴포넌트 정의
  const MapNodeComponent = {
    name: 'MapNode',
    props: {
      node: {
        type: Object,
        required: true
      }
    },
    emits: ['update'],
    setup(props) {
      const { ref, computed } = Vue;

      // 입력 상태
      const locationInput = ref('');
      const latInput = ref('');
      const lngInput = ref('');

      // 노드 메타데이터에서 지도 데이터 가져오기
      const mapData = computed(() => {
        return props.node.metadata?.mapData || null;
      });

      // 위치 정보가 있는지 확인
      const hasLocation = computed(() => {
        return !!mapData.value;
      });

      // 위치 이름
      const locationName = computed(() => {
        return mapData.value?.locationName || '';
      });

      // 위도
      const latitude = computed(() => {
        return mapData.value?.latitude || 0;
      });

      // 경도
      const longitude = computed(() => {
        return mapData.value?.longitude || 0;
      });

      // 좌표 문자열
      const coordinates = computed(() => {
        if (!hasLocation.value) return '';
        return `위도: ${latitude.value}, 경도: ${longitude.value}`;
      });

      // 지도 URL
      const mapUrl = computed(() => {
        if (!hasLocation.value) return '';
        return methods.getMapUrl(locationName.value, latitude.value, longitude.value);
      });

      // 좌표 유효성 검사
      const isValidCoordinates = computed(() => {
        if (!latInput.value || !lngInput.value) return false;

        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        return !isNaN(lat) && !isNaN(lng) &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
      });

      return {
        locationInput,
        latInput,
        lngInput,
        hasLocation,
        locationName,
        latitude,
        longitude,
        coordinates,
        mapUrl,
        isValidCoordinates,
        ...methods
      };
    },
    template: template
  };

  // 노드 초기화 함수
  function initializeNode(node) {
    // 노드가 이미 초기화되어 있는지 확인
    if (node.type === 'map' && node.metadata?.initialized) {
      return node;
    }

    // 기본값으로 노드 초기화
    return {
      ...node,
      type: 'map',
      content: '',
      metadata: {
        ...node.metadata,
        mapData: null,
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
      name: 'MapNode',
      nodeType: 'map',
      initialize: initializeNode,
      component: MapNodeComponent
    }
  );

  console.log('지도 확장 노드가 로드되었습니다.');
})(Vue, ExtensionManager);
