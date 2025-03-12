// chart-node.js - 차트 기능을 제공하는 외부 확장 노드 예시
(function(Vue, ExtensionManager) {
  // 차트 노드 정의
  const extensionDefinition = {
    id: 'chart-node',
    type: 'chart',
    name: '차트',
    description: '데이터를 시각화하는 차트를 생성합니다',
    icon: 'bar_chart',
    color: '#E91E63',
    version: '1.0.0',
    author: 'External Developer'
  };

  // 차트 노드 컴포넌트 템플릿
  const template = `
    <div class="chart-node">
      <div v-if="chartData.length > 0" class="chart-container">
        <canvas ref="chartCanvas" width="100%" height="300"></canvas>
      </div>
      <div v-else class="empty-chart">
        <div class="chart-controls">
          <q-btn outline color="primary" label="데이터 추가" @click="addData" />
          <q-btn outline color="secondary" label="샘플 데이터" @click="useSampleData" />
        </div>
      </div>
      <div class="chart-options" v-if="chartData.length > 0">
        <div class="chart-type-selector">
          <label>차트 타입:</label>
          <select v-model="chartType" @change="renderChart">
            <option value="bar">막대 차트</option>
            <option value="line">라인 차트</option>
            <option value="pie">파이 차트</option>
          </select>
        </div>
      </div>
    </div>
  `;

  // 차트 노드 스타일
  const style = `
    .chart-node {
      width: 100%;
      margin: 12px 0;
    }
    .chart-container {
      height: 300px;
      background-color: #fff;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .empty-chart {
      height: 120px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9f9f9;
    }
    .chart-controls {
      display: flex;
      gap: 8px;
    }
    .chart-options {
      margin-top: 8px;
      padding: 8px;
      border-radius: 4px;
      background-color: #f5f5f5;
    }
    .chart-type-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    select {
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
  `;

  // 차트 노드 컴포넌트 정의
  const chartNodeComponent = {
    name: 'ChartNode',
    template: template,
    props: {
      node: Object
    },
    data() {
      return {
        chartType: this.node.metadata?.chartType || 'bar',
        chartData: this.node.metadata?.chartData || [],
        chartInstance: null
      };
    },
    mounted() {
      if (this.chartData.length > 0) {
        this.$nextTick(() => {
          this.renderChart();
        });
      }
    },
    methods: {
      // 차트 렌더링
      renderChart() {
        // 차트 라이브러리가 필요하지만, 이 예시에서는 가상으로 구현
        console.log('차트 렌더링:', {
          type: this.chartType,
          data: this.chartData
        });

        // 노드 데이터 업데이트
        this.updateNode();
      },

      // 데이터 추가
      addData() {
        // 간단한 데이터 추가 예시
        this.chartData.push({
          label: '항목 ' + (this.chartData.length + 1),
          value: Math.floor(Math.random() * 100)
        });

        this.renderChart();
      },

      // 샘플 데이터 사용
      useSampleData() {
        this.chartData = [
          { label: '1월', value: 65 },
          { label: '2월', value: 59 },
          { label: '3월', value: 80 },
          { label: '4월', value: 81 },
          { label: '5월', value: 56 },
          { label: '6월', value: 55 }
        ];

        this.renderChart();
      },

      // 노드 업데이트
      updateNode() {
        this.$emit('update', {
          ...this.node,
          metadata: {
            ...this.node.metadata,
            chartType: this.chartType,
            chartData: this.chartData
          }
        });
      }
    }
  };

  // 노드 초기화 함수
  function initialize(node) {
    return {
      ...node,
      type: 'chart',
      content: '',
      metadata: {
        ...node.metadata,
        chartType: 'bar',
        chartData: []
      }
    };
  }

  // 확장 노드 등록
  ExtensionManager.registerExtension(
    extensionDefinition,
    {
      name: 'ChartNode',
      nodeType: 'chart',
      initialize: initialize,
      component: chartNodeComponent
    }
  );

  console.log('차트 확장 노드가 로드되었습니다.');
})(window.Vue, window.ExtensionManager);
