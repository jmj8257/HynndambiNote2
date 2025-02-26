// weather-node.js - 날씨 정보를 표시하는 외부 확장 노드
(function(Vue, ExtensionManager) {
  // 날씨 노드 정의
  const extensionDefinition = {
    id: 'weather-node',
    type: 'weather',
    name: '날씨',
    description: '도시별 날씨 정보를 표시합니다',
    icon: 'wb_sunny',
    color: '#2196F3',
    version: '1.0.0',
    author: 'External Developer'
  };

  // 날씨 노드 컴포넌트 템플릿
  const template = `
    <div class="weather-node">
      <div v-if="city && !loading" class="weather-container">
        <div class="weather-header">
          <div class="weather-location">
            <q-icon name="location_on" />
            <span>{{ city }}</span>
          </div>
          <q-btn flat round dense icon="edit" @click="editCity" />
        </div>

        <div v-if="weatherData" class="weather-content">
          <div class="weather-main">
            <div class="weather-icon">
              <q-icon :name="getWeatherIcon(weatherData.weather)" size="48px" />
            </div>
            <div class="weather-temp">
              <div class="temp-current">{{ Math.round(weatherData.temp) }}°C</div>
              <div class="temp-range">
                <span>{{ Math.round(weatherData.temp_min) }}°</span>
                <span>{{ Math.round(weatherData.temp_max) }}°</span>
              </div>
            </div>
          </div>

          <div class="weather-details">
            <div class="weather-detail-item">
              <q-icon name="water_drop" />
              <span>습도: {{ weatherData.humidity }}%</span>
            </div>
            <div class="weather-detail-item">
              <q-icon name="air" />
              <span>풍속: {{ weatherData.wind_speed }} m/s</span>
            </div>
            <div class="weather-detail-item">
              <q-icon name="visibility" />
              <span>가시거리: {{ weatherData.visibility / 1000 }} km</span>
            </div>
          </div>

          <div class="weather-description">
            {{ weatherData.description }}
          </div>

          <div class="weather-update-time">
            마지막 업데이트: {{ formatDate(weatherData.update_time) }}
          </div>
        </div>

        <div v-else class="weather-error">
          <q-icon name="error_outline" color="orange" size="24px" />
          <p>날씨 정보를 가져올 수 없습니다</p>
          <q-btn outline color="primary" size="sm" @click="refreshWeather">다시 시도</q-btn>
        </div>
      </div>

      <div v-else-if="loading" class="weather-loading">
        <q-spinner color="primary" size="40px" />
        <p>날씨 정보를 불러오는 중...</p>
      </div>

      <div v-else class="weather-empty">
        <div class="city-input">
          <q-input
            v-model="cityInput"
            label="도시 이름 입력 (예: Seoul, Tokyo, New York)"
            outlined
            dense
          >
            <template v-slot:append>
              <q-btn round dense flat icon="search" @click="setCity" :disable="!cityInput" />
            </template>
          </q-input>
        </div>
        <div class="weather-help">
          <p>원하는 도시의 실시간 날씨 정보를 표시합니다</p>
          <p>도시 이름은 영문으로 입력해주세요</p>
        </div>
      </div>
    </div>
  `;

  // 날씨 노드 스타일
  const style = `
    .weather-node {
      width: 100%;
      margin: 12px 0;
    }
    .weather-container {
      border-radius: 8px;
      overflow: hidden;
      background-color: #f5f9ff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .weather-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: #2196F3;
      color: white;
    }
    .weather-location {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .weather-content {
      padding: 16px;
    }
    .weather-main {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
    }
    .weather-temp {
      display: flex;
      flex-direction: column;
    }
    .temp-current {
      font-size: 2.2rem;
      font-weight: 700;
    }
    .temp-range {
      display: flex;
      gap: 12px;
      color: #666;
    }
    .weather-details {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }
    .weather-detail-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.9rem;
      color: #444;
    }
    .weather-description {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 12px;
    }
    .weather-update-time {
      font-size: 0.8rem;
      color: #666;
    }
    .weather-empty, .weather-error, .weather-loading {
      padding: 20px;
      border: 2px dashed #ddd;
      border-radius: 4px;
      background-color: #f9f9f9;
      text-align: center;
    }
    .weather-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .city-input {
      margin-bottom: 16px;
    }
    .weather-help {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
    }
    .weather-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #d32f2f;
    }
  `;

  // 날씨 아이콘 매핑
  const weatherIcons = {
    'Clear': 'wb_sunny',
    'Clouds': 'cloud',
    'Rain': 'water',
    'Drizzle': 'grain',
    'Thunderstorm': 'flash_on',
    'Snow': 'ac_unit',
    'Mist': 'cloud',
    'Smoke': 'cloud',
    'Haze': 'cloud',
    'Dust': 'cloud',
    'Fog': 'cloud',
    'Sand': 'cloud',
    'Ash': 'cloud',
    'Squall': 'air',
    'Tornado': 'tornado'
  };

  // 날씨 데이터 가져오기 (실제 API 키 필요, 여기서는 모의 데이터 사용)
  const fetchWeatherData = async (city) => {
    // 참고: 실제 구현 시에는 OpenWeatherMap 등의 API를 사용해야 합니다
    // 현재는 모의 데이터를 반환합니다

    // 모의 지연 시간
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 도시 이름에 따라 다른 날씨 생성
    const cityLower = city.toLowerCase();
    let weatherType = 'Clear';
    let temp = 25;

    if (cityLower.includes('seoul')) {
      weatherType = 'Clouds';
      temp = 22;
    } else if (cityLower.includes('tokyo')) {
      weatherType = 'Rain';
      temp = 20;
    } else if (cityLower.includes('london')) {
      weatherType = 'Drizzle';
      temp = 15;
    } else if (cityLower.includes('new york')) {
      weatherType = 'Clear';
      temp = 28;
    }

    return {
      weather: weatherType,
      description: `${weatherType} sky`,
      temp: temp,
      temp_min: temp - 2,
      temp_max: temp + 2,
      humidity: Math.floor(Math.random() * 30) + 50,
      wind_speed: Math.floor(Math.random() * 5) + 2,
      visibility: 10000,
      update_time: new Date()
    };
  };

  // 날씨 노드 메서드
  const methods = {
    // 날씨 아이콘 가져오기
    getWeatherIcon(weather) {
      return weatherIcons[weather] || 'help_outline';
    },

    // 날짜 포맷팅
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    },

    // 도시 설정 및 날씨 가져오기
    async setCity() {
      if (!this.cityInput) return;

      this.loading = true;
      try {
        const weatherData = await fetchWeatherData(this.cityInput);

        const updatedNode = { ...this.node };
        updatedNode.metadata = updatedNode.metadata || {};
        updatedNode.metadata.city = this.cityInput;
        updatedNode.metadata.weatherData = weatherData;

        this.$emit('update', updatedNode);
      } catch (error) {
        console.error('날씨 데이터 가져오기 실패:', error);

        const updatedNode = { ...this.node };
        updatedNode.metadata = updatedNode.metadata || {};
        updatedNode.metadata.city = this.cityInput;
        updatedNode.metadata.weatherData = null;

        this.$emit('update', updatedNode);
      } finally {
        this.loading = false;
      }
    },

    // 도시 편집
    editCity() {
      this.cityInput = this.city;

      const updatedNode = { ...this.node };
      updatedNode.metadata = updatedNode.metadata || {};
      updatedNode.metadata.city = '';
      updatedNode.metadata.weatherData = null;

      this.$emit('update', updatedNode);
    },

    // 날씨 정보 새로고침
    async refreshWeather() {
      if (!this.city) return;

      this.loading = true;
      try {
        const weatherData = await fetchWeatherData(this.city);

        const updatedNode = { ...this.node };
        updatedNode.metadata = updatedNode.metadata || {};
        updatedNode.metadata.weatherData = weatherData;

        this.$emit('update', updatedNode);
      } catch (error) {
        console.error('날씨 데이터 가져오기 실패:', error);
      } finally {
        this.loading = false;
      }
    }
  };

  // 날씨 노드 컴포넌트 정의
  const WeatherNodeComponent = {
    name: 'WeatherNode',
    props: {
      node: {
        type: Object,
        required: true
      }
    },
    emits: ['update'],
    setup(props) {
      const { ref, computed, onMounted } = Vue;

      // 입력 상태
      const cityInput = ref('');
      const loading = ref(false);

      // 노드 메타데이터에서 값 가져오기
      const city = computed(() => props.node.metadata?.city || '');
      const weatherData = computed(() => props.node.metadata?.weatherData || null);

      // 컴포넌트 마운트 시 날씨 데이터 새로고침
      onMounted(() => {
        if (city.value) {
          methods.refreshWeather.call({
            city: city.value,
            loading,
            node: props.node,
            $emit: props.emit
          });
        }
      });

      return {
        cityInput,
        loading,
        city,
        weatherData,
        ...methods
      };
    },
    template: template
  };

  // 노드 초기화 함수
  function initializeNode(node) {
    // 노드가 이미 초기화되어 있는지 확인
    if (node.type === 'weather' && node.metadata?.initialized) {
      return node;
    }

    // 기본값으로 노드 초기화
    return {
      ...node,
      type: 'weather',
      content: '',
      metadata: {
        ...node.metadata,
        city: '',
        weatherData: null,
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
      name: 'WeatherNode',
      nodeType: 'weather',
      initialize: initializeNode,
      component: WeatherNodeComponent
    }
  );

  console.log('날씨 확장 노드가 로드되었습니다.');
})(Vue, ExtensionManager);
