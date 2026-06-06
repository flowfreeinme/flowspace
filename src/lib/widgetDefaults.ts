import type {
  TodayConfig, FocusQueueConfig, RecentWorkConfig, TodoListConfig,
  ProPlannerConfig, FocusTimerConfig, WeatherConfig, CalendarConfig,
} from '@/types/widgetSettings'
import type { HomeWidgetType } from '@/types'

export const DEFAULT_WIDGET_SETTINGS: Record<HomeWidgetType, object> = {
  today: {
    greeting: 'Good morning',
    dateFormat: 'weekday-month-day',
    showClock: true,
    showNextEvent: true,
    showWeatherSummary: false,
    showPagesCreatedToday: true,
  } satisfies TodayConfig,

  focus: {
    title: 'Focus Queue',
    itemCount: 3,
    filter: 'all',
    pinnedIds: [],
  } satisfies FocusQueueConfig,

  recent: {
    title: 'Recent Work',
    itemCount: 5,
    filter: 'all',
    sortBy: 'lastOpened',
    excludedFolderIds: [],
  } satisfies RecentWorkConfig,

  todoList: {
    title: 'To-do list',
    items: [
      { id: 'todo-1', text: 'Add your first task', done: false },
    ],
  } satisfies TodoListConfig,

  proPlanner: {
    workStart: '09:00',
    workEnd: '17:00',
    focusStyle: 'balanced',
    customInstructions: '',
    includedCalendarIds: [],
    refreshMode: 'manual',
    autoRefreshTime: '08:00',
  } satisfies ProPlannerConfig,

  focusTimer: {
    presets: [
      { label: '25m', minutes: 25 },
      { label: '50m', minutes: 50 },
      { label: '90m', minutes: 90 },
    ],
    breakEnabled: false,
    breakMinutes: 5,
    autoStart: false,
    completionSound: 'chime',
    dailyGoal: 0,
  } satisfies FocusTimerConfig,

  weather: {
    unit: 'F',
    showHumidity: true,
    showWind: true,
    showPrecipitation: true,
    showUvIndex: false,
    showFeelsLike: true,
    showSunriseSunset: false,
    forecastDays: 1,
  } satisfies WeatherConfig,

  calendar: {
    weekStartsOn: 'sunday',
    showWeekends: true,
    visibleCalendarIds: [],
    showEventTimes: true,
  } satisfies CalendarConfig,

  aiBriefing: {},
}
