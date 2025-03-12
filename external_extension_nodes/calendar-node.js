// calendar-node.js - 캘린더 및 일정을 표시하는 외부 확장 노드
(function(Vue, ExtensionManager) {
  // 캘린더 노드 정의
  const extensionDefinition = {
    id: 'calendar-node',
    type: 'calendar',
    name: '캘린더',
    description: '일정과 날짜 정보를 노트에 추가합니다',
    icon: 'event',
    color: '#FF9800',
    version: '1.0.0',
    author: 'External Developer'
  };

  // 캘린더 노드 컴포넌트 템플릿
  const template = `
    <div class="calendar-node">
      <div class="calendar-header">
        <div class="month-selector">
          <q-btn flat dense round icon="chevron_left" @click="prevMonth" />
          <span class="month-title">{{ currentMonthName }} {{ currentYear }}</span>
          <q-btn flat dense round icon="chevron_right" @click="nextMonth" />
        </div>
        <div class="calendar-actions">
          <q-btn flat dense :icon="isEditMode ? 'check' : 'edit'" @click="toggleEditMode" :color="isEditMode ? 'positive' : ''" />
          <q-btn flat dense icon="today" @click="goToToday" />
        </div>
      </div>

      <div class="calendar-grid">
        <!-- 요일 헤더 -->
        <div v-for="day in weekDays" :key="day" class="calendar-day-header">
          {{ day }}
        </div>

        <!-- 날짜 그리드 -->
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-day"
          :class="{
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'has-events': day.events.length > 0,
            'selected': isSelectedDay(day.date)
          }"
          @click="selectDay(day)"
        >
          <span class="day-number">{{ day.dayNumber }}</span>
          <div v-if="day.events.length > 0" class="day-events">
            <div
              v-for="(event, eventIndex) in day.events.slice(0, 2)"
              :key="eventIndex"
              class="event-dot"
              :style="{ backgroundColor: event.color }"
            ></div>
            <div v-if="day.events.length > 2" class="more-events">+{{ day.events.length - 2 }}</div>
          </div>
        </div>
      </div>

      <!-- 일정 목록 및 편집 -->
      <div v-if="selectedDay" class="events-panel">
        <div class="events-header">
          <h6 class="events-date">{{ formatSelectedDate }}</h6>
          <q-btn v-if="isEditMode" flat dense round icon="add" color="primary" @click="showAddEventDialog = true" />
        </div>

        <div v-if="selectedDayEvents.length === 0" class="no-events">
          <p v-if="isEditMode">일정을 추가하려면 + 버튼을 클릭하세요</p>
          <p v-else>일정이 없습니다</p>
        </div>

        <div v-else class="events-list">
          <div
            v-for="(event, index) in selectedDayEvents"
            :key="index"
            class="event-item"
          >
            <div class="event-color" :style="{ backgroundColor: event.color }"></div>
            <div class="event-content">
              <div class="event-time">{{ formatEventTime(event) }}</div>
              <div class="event-title">{{ event.title }}</div>
            </div>
            <q-btn
              v-if="isEditMode"
              flat
              dense
              round
              icon="delete"
              color="negative"
              size="sm"
              @click="removeEvent(index)"
            />
          </div>
        </div>
      </div>

      <!-- 일정 추가 다이얼로그 -->
      <q-dialog v-model="showAddEventDialog">
        <q-card style="width: 300px">
          <q-card-section>
            <div class="text-h6">일정 추가</div>
          </q-card-section>

          <q-card-section>
            <q-input v-model="newEvent.title" label="제목" dense autofocus />

            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-6">
                <q-input v-model="newEvent.startTime" label="시작 시간" type="time" dense />
              </div>
              <div class="col-6">
                <q-input v-model="newEvent.endTime" label="종료 시간" type="time" dense />
              </div>
            </div>

            <div class="q-mt-sm">
              <q-input v-model="newEvent.description" label="설명" type="textarea" dense autogrow />
            </div>

            <div class="q-mt-sm">
              <div class="row items-center">
                <div class="col-3">색상:</div>
                <div class="col-9">
                  <div class="row q-col-gutter-xs">
                    <div
                      v-for="color in eventColors"
                      :key="color"
                      class="col-2 color-option"
                      :style="{ backgroundColor: color }"
                      :class="{ 'selected': newEvent.color === color }"
                      @click="newEvent.color = color"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="취소" color="negative" v-close-popup />
            <q-btn flat label="추가" color="primary" @click="addEvent" :disable="!newEvent.title" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  `;

  // 캘린더 노드 스타일
  const style = `
    .calendar-node {
      width: 100%;
      margin: 12px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
      background-color: white;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: #f5f5f5;
    }
    .month-selector {
      display: flex;
      align-items: center;
    }
    .month-title {
      font-weight: 500;
      margin: 0 12px;
      min-width: 120px;
      text-align: center;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid #f0f0f0;
    }
    .calendar-day-header {
      text-align: center;
      padding: 8px;
      font-weight: 500;
      font-size: 0.8rem;
      color: #555;
      border-bottom: 1px solid #f0f0f0;
      background-color: #fafafa;
    }
    .calendar-day {
      position: relative;
      height: 60px;
      padding: 4px;
      border-right: 1px solid #f0f0f0;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      overflow: hidden;
    }
    .calendar-day:nth-child(7n) {
      border-right: none;
    }
    .day-number {
      font-size: 0.9rem;
      color: #333;
    }
    .other-month {
      background-color: #f9f9f9;
    }
    .other-month .day-number {
      color: #bbb;
    }
    .today {
      background-color: #e3f2fd;
    }
    .today .day-number {
      font-weight: bold;
      color: #1976d2;
    }
    .selected {
      background-color: #fff8e1;
    }
    .has-events .day-number {
      font-weight: 500;
    }
    .day-events {
      display: flex;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .event-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 4px;
      margin-bottom: 2px;
    }
    .more-events {
      font-size: 0.7rem;
      color: #666;
    }
    .events-panel {
      padding: 12px 16px;
    }
    .events-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .events-date {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
    }
    .no-events {
      text-align: center;
      color: #777;
      padding: 16px 0;
      font-size: 0.9rem;
    }
    .events-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .event-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .event-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 12px;
    }
    .event-content {
      flex-grow: 1;
    }
    .event-time {
      font-size: 0.8rem;
      color: #666;
    }
    .event-title {
      font-weight: 500;
    }
    .color-option {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .color-option:hover {
      transform: scale(1.2);
    }
    .color-option.selected {
      border: 2px solid rgba(0, 0, 0, 0.3);
    }
  `;

  // 날짜 관련 유틸 함수
  const dateUtils = {
    // 특정 월의 첫 날 구하기
    getFirstDayOfMonth(year, month) {
      return new Date(year, month, 1);
    },

    // 특정 월의 마지막 날 구하기
    getLastDayOfMonth(year, month) {
      return new Date(year, month + 1, 0);
    },

    // 날짜의 요일 구하기 (0: 일요일, 6: 토요일)
    getDayOfWeek(date) {
      return date.getDay();
    },

    // 특정 월의 총 일수 구하기
    getDaysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    },

    // 날짜 포맷팅 (YYYY-MM-DD)
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // 날짜 비교 (같은 날짜인지)
    isSameDate(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
    },

    // 오늘인지 확인
    isToday(date) {
      const today = new Date();
      return this.isSameDate(date, today);
    }
  };

  // 캘린더 노드 컴포넌트 정의
  const CalendarNodeComponent = {
    name: 'CalendarNode',
    props: {
      node: {
        type: Object,
        required: true
      }
    },
    emits: ['update'],
    setup(props, { emit }) {
      const { ref, reactive, computed, onMounted, watch } = Vue;

      // 날짜 상태
      const currentDate = ref(new Date());
      const selectedDay = ref(null);
      const isEditMode = ref(false);
      const showAddEventDialog = ref(false);

      // 새 일정 템플릿
      const newEvent = reactive({
        title: '',
        startTime: '',
        endTime: '',
        description: '',
        color: '#1976D2'
      });

      // 일정 색상 옵션
      const eventColors = [
        '#1976D2', // 파랑
        '#4CAF50', // 초록
        '#FF9800', // 주황
        '#E91E63', // 핑크
        '#9C27B0', // 보라
        '#F44336', // 빨강
        '#00BCD4', // 청록
        '#009688', // 틸
        '#795548', // 갈색
        '#607D8B'  // 블루그레이
      ];

      // 요일명
      const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

      // 현재 년도
      const currentYear = computed(() => {
        return currentDate.value.getFullYear();
      });

      // 현재 월 (0-11)
      const currentMonth = computed(() => {
        return currentDate.value.getMonth();
      });

      // 현재 월 이름
      const currentMonthName = computed(() => {
        return new Intl.DateTimeFormat('ko-KR', { month: 'long' }).format(currentDate.value);
      });

      // 선택된 날짜 포맷
      const formatSelectedDate = computed(() => {
        if (!selectedDay.value) return '';

        const date = selectedDay.value.date;
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekDays[date.getDay()]})`;
      });

      // 달력 데이터 계산
      const calendarDays = computed(() => {
        const year = currentYear.value;
        const month = currentMonth.value;

        const firstDay = dateUtils.getFirstDayOfMonth(year, month);
        const startingDayOfWeek = dateUtils.getDayOfWeek(firstDay);
        const daysInMonth = dateUtils.getDaysInMonth(year, month);

        const days = [];

        // 이전 달 날짜 채우기
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = dateUtils.getDaysInMonth(prevYear, prevMonth);

        for (let i = 0; i < startingDayOfWeek; i++) {
          const dayNumber = daysInPrevMonth - startingDayOfWeek + i + 1;
          const date = new Date(prevYear, prevMonth, dayNumber);

          days.push({
            date,
            dayNumber,
            isCurrentMonth: false,
            isToday: dateUtils.isToday(date),
            events: getEventsForDate(date)
          });
        }

        // 현재 달 날짜 채우기
        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(year, month, i);

          days.push({
            date,
            dayNumber: i,
            isCurrentMonth: true,
            isToday: dateUtils.isToday(date),
            events: getEventsForDate(date)
          });
        }

        // 다음 달 날짜 채우기 (42개 셀 맞추기 - 6주)
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const remainingDays = 42 - days.length;

        for (let i = 1; i <= remainingDays; i++) {
          const date = new Date(nextYear, nextMonth, i);

          days.push({
            date,
            dayNumber: i,
            isCurrentMonth: false,
            isToday: dateUtils.isToday(date),
            events: getEventsForDate(date)
          });
        }

        return days;
      });

      // 선택된 날의 일정 목록
      const selectedDayEvents = computed(() => {
        if (!selectedDay.value) return [];
        return selectedDay.value.events;
      });

      // 선택된 날짜인지 확인
      function isSelectedDay(date) {
        if (!selectedDay.value) return false;
        return dateUtils.isSameDate(date, selectedDay.value.date);
      }

      // 노드 메타데이터에서 일정 데이터 가져오기
      function getCalendarData() {
        return props.node.metadata?.calendarData || {
          events: {}
        };
      }

      // 특정 날짜의 일정 가져오기
      function getEventsForDate(date) {
        const calendarData = getCalendarData();
        const dateStr = dateUtils.formatDate(date);
        return calendarData.events[dateStr] || [];
      }

      // 이전 달로 이동
      function prevMonth() {
        const newDate = new Date(currentDate.value);
        newDate.setMonth(newDate.getMonth() - 1);
        currentDate.value = newDate;
        selectedDay.value = null;
      }

      // 다음 달로 이동
      function nextMonth() {
        const newDate = new Date(currentDate.value);
        newDate.setMonth(newDate.getMonth() + 1);
        currentDate.value = newDate;
        selectedDay.value = null;
      }

      // 오늘로 이동
      function goToToday() {
        currentDate.value = new Date();

        // 오늘 날짜 선택
        const today = calendarDays.value.find(day => day.isToday);
        if (today) {
          selectDay(today);
        }
      }

      // 날짜 선택
      function selectDay(day) {
        selectedDay.value = day;
      }

      // 편집 모드 토글
      function toggleEditMode() {
        isEditMode.value = !isEditMode.value;
      }

      // 일정 시간 포맷팅
      function formatEventTime(event) {
        if (!event.startTime) return '종일';
        if (event.startTime && !event.endTime) return event.startTime;
        return `${event.startTime} - ${event.endTime}`;
      }

      // 일정 추가
      function addEvent() {
        if (!selectedDay.value || !newEvent.title) return;

        const date = selectedDay.value.date;
        const dateStr = dateUtils.formatDate(date);

        const calendarData = getCalendarData();
        if (!calendarData.events[dateStr]) {
          calendarData.events[dateStr] = [];
        }

        // 새 일정 추가
        calendarData.events[dateStr].push({
          title: newEvent.title,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          description: newEvent.description,
          color: newEvent.color
        });

        // 노드 업데이트
        updateNodeCalendarData(calendarData);

        // 입력 필드 초기화
        newEvent.title = '';
        newEvent.startTime = '';
        newEvent.endTime = '';
        newEvent.description = '';

        // 선택된 날짜 다시 계산 (일정 표시 업데이트)
        const updatedDay = calendarDays.value.find(day =>
          dateUtils.isSameDate(day.date, selectedDay.value.date)
        );
        if (updatedDay) {
          selectDay(updatedDay);
        }
      }

      // 일정 삭제
      function removeEvent(index) {
        if (!selectedDay.value) return;

        const date = selectedDay.value.date;
        const dateStr = dateUtils.formatDate(date);

        const calendarData = getCalendarData();
        if (calendarData.events[dateStr]) {
          calendarData.events[dateStr].splice(index, 1);

          // 빈 배열이면 삭제
          if (calendarData.events[dateStr].length === 0) {
            delete calendarData.events[dateStr];
          }

          // 노드 업데이트
          updateNodeCalendarData(calendarData);

          // 선택된 날짜 다시 계산 (일정 표시 업데이트)
          const updatedDay = calendarDays.value.find(day =>
            dateUtils.isSameDate(day.date, selectedDay.value.date)
          );
          if (updatedDay) {
            selectDay(updatedDay);
          }
        }
      }

      // 노드 캘린더 데이터 업데이트
      function updateNodeCalendarData(calendarData) {
        const updatedNode = { ...props.node };
        updatedNode.metadata = updatedNode.metadata || {};
        updatedNode.metadata.calendarData = calendarData;

        emit('update', updatedNode);
      }

      // 컴포넌트 마운트 시 초기화
      onMounted(() => {
        // 오늘 날짜 선택
        const today = calendarDays.value.find(day => day.isToday);
        if (today) {
          selectDay(today);
        }
      });

      return {
        currentDate,
        currentYear,
        currentMonth,
        currentMonthName,
        weekDays,
        calendarDays,
        selectedDay,
        selectedDayEvents,
        formatSelectedDate,
        isEditMode,
        showAddEventDialog,
        newEvent,
        eventColors,
        prevMonth,
        nextMonth,
        goToToday,
        selectDay,
        isSelectedDay,
        toggleEditMode,
        formatEventTime,
        addEvent,
        removeEvent
      };
    },
    template: template
  };

  // 노드 초기화 함수
  function initializeNode(node) {
    // 노드가 이미 초기화되어 있는지 확인
    if (node.type === 'calendar' && node.metadata?.initialized) {
      return node;
    }

    // 기본값으로 노드 초기화
    return {
      ...node,
      type: 'calendar',
      content: '',
      metadata: {
        ...node.metadata,
        calendarData: {
          events: {}
        },
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
      name: 'CalendarNode',
      nodeType: 'calendar',
      initialize: initializeNode,
      component: CalendarNodeComponent
    }
  );

  console.log('캘린더 확장 노드가 로드되었습니다.');
})(Vue, ExtensionManager);
