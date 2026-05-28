export interface TodayConfig {
  greeting: string
  dateFormat: 'weekday-month-day' | 'month-day-year' | 'mm-dd-yyyy'
  showClock: boolean
  showNextEvent: boolean
  showWeatherSummary: boolean
  showPagesCreatedToday: boolean
}

export interface FocusQueueConfig {
  title: string
  itemCount: number
  filter: 'all' | 'pages' | 'boards'
  pinnedIds: string[]
}

export interface RecentWorkConfig {
  title: string
  itemCount: number
  filter: 'all' | 'pages' | 'boards'
  sortBy: 'lastOpened' | 'lastModified'
  excludedFolderIds: string[]
}

export interface QuickCaptureButton {
  id: 'board' | 'page' | 'event'
  label: string
  enabled: boolean
}

export interface QuickCaptureConfig {
  buttons: QuickCaptureButton[]
}

export interface ProPlannerConfig {
  workStart: string
  workEnd: string
  focusStyle: 'deep-work' | 'meetings' | 'balanced'
  customInstructions: string
  includedCalendarIds: string[]
  refreshMode: 'manual' | 'auto'
  autoRefreshTime: string
}

export interface FocusTimerPreset {
  label: string
  minutes: number
}

export interface FocusTimerConfig {
  presets: FocusTimerPreset[]
  breakEnabled: boolean
  breakMinutes: 5 | 10 | 15
  autoStart: boolean
  completionSound: 'off' | 'chime' | 'bell'
  dailyGoal: 0 | 2 | 4 | 6 | 8
}

export interface WeatherConfig {
  unit: 'F' | 'C'
  showHumidity: boolean
  showWind: boolean
  showPrecipitation: boolean
  showUvIndex: boolean
  showFeelsLike: boolean
  showSunriseSunset: boolean
  forecastDays: 1 | 3
}

export interface CalendarConfig {
  weekStartsOn: 'sunday' | 'monday'
  showWeekends: boolean
  visibleCalendarIds: string[]
  showEventTimes: boolean
}

export type WidgetConfig =
  | TodayConfig
  | FocusQueueConfig
  | RecentWorkConfig
  | QuickCaptureConfig
  | ProPlannerConfig
  | FocusTimerConfig
  | WeatherConfig
  | CalendarConfig

export type WidgetConfigMap = {
  today: TodayConfig
  focus: FocusQueueConfig
  recent: RecentWorkConfig
  quickCapture: QuickCaptureConfig
  proPlanner: ProPlannerConfig
  focusTimer: FocusTimerConfig
  weather: WeatherConfig
  calendar: CalendarConfig
}
