import { v4 as uuid } from 'uuid'
import type { Block, HomeWidget } from '@/types'
import type { WidgetConfigMap } from '@/types/widgetSettings'
import { TEMPLATES as SINGLE_BOARD_TEMPLATES } from './templates'

export type StarterTemplateId = string
export type StarterTemplateCategory = 'workspace' | 'board'
export type TemplateHomeMode = 'merge' | 'replace' | 'none'

export interface BoardDefinition {
  title: string
  icon: string
  blocks: Block[]
}

export interface StarterTemplate {
  id: StarterTemplateId
  category: StarterTemplateCategory
  label: string
  icon: string
  description: string
  tags: string[]
  boardCount: number
  buildBoards: () => BoardDefinition[]
  widgets: HomeWidget[]
  widgetSettings?: Partial<{ [K in keyof WidgetConfigMap]: Partial<WidgetConfigMap[K]> }>
}

const CARD_W = 280
const CARD_H = 140

function card(text: string, x: number, y: number, w = CARD_W, h = CARD_H): Block {
  return { id: uuid(), type: 'textbox', content: JSON.stringify({ text, x, y, width: w, height: h }) }
}

function section(title: string, x: number, y: number): Block {
  return { id: uuid(), type: 'section', content: JSON.stringify({ title, x, y }) }
}

const WORKSPACE_TEMPLATES: StarterTemplate[] = [
  {
    id: 'student',
    category: 'workspace',
    label: 'Student',
    icon: '🎓',
    description: 'Classes, assignments, study goals, focus blocks, and weather-aware planning.',
    tags: ['3 boards', '7 widgets', 'Study mode'],
    boardCount: 3,
    buildBoards: () => [
      {
        title: 'Class Notes',
        icon: '📚',
        blocks: [
          section('Lectures', 0, 300),
          card('Drop lecture notes here after class.', 0, 344),
          section('Reading', 300, 300),
          card('Track chapters, articles, and study guides.', 300, 344),
          section('Resources', 600, 300),
          card('Paste useful links, files, formulas, and references.', 600, 344),
        ],
      },
      {
        title: 'Assignments',
        icon: '📋',
        blocks: [
          section('To Do', 0, 300),
          card('Review chapter 1', 0, 344),
          card('Submit essay draft', 0, 504),
          card('Prepare for exam', 0, 664),
          section('In Progress', 300, 300),
          card('Move active assignments here.', 300, 344),
          section('Done', 600, 300),
          card('Completed work goes here for review.', 600, 344),
        ],
      },
      {
        title: 'Study Goals',
        icon: '🎯',
        blocks: [
          section('This Week', 0, 300),
          card('List study sessions and office hours.', 0, 344),
          section('This Month', 300, 300),
          card('Map upcoming tests, papers, and projects.', 300, 344),
          section('Long Term', 600, 300),
          card('Keep semester goals visible.', 600, 344),
        ],
      },
    ],
    widgets: [
      { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 8 },
      { id: 'weather', type: 'weather', x: 0, y: 8, w: 4, h: 4 },
      { id: 'proPlanner', type: 'proPlanner', x: 4, y: 8, w: 4, h: 4 },
      { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
      { id: 'focusTimer', type: 'focusTimer', x: 8, y: 3, w: 4, h: 3 },
      { id: 'focus', type: 'focus', x: 8, y: 6, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture', x: 8, y: 9, w: 4, h: 3 },
    ],
    widgetSettings: {
      calendar: { weekStartsOn: 'monday', showWeekends: true, showEventTimes: true },
      today: { greeting: 'Study plan', showWeatherSummary: true, showPagesCreatedToday: true },
      focus: { title: 'Study queue', itemCount: 4, filter: 'boards' },
      focusTimer: {
        presets: [{ label: '25m', minutes: 25 }, { label: '50m', minutes: 50 }, { label: '90m', minutes: 90 }],
        breakEnabled: true,
        breakMinutes: 5,
        dailyGoal: 4,
      },
      proPlanner: {
        workStart: '08:00',
        workEnd: '21:00',
        focusStyle: 'deep-work',
        customInstructions: 'Protect study blocks before social or admin tasks.',
      },
      weather: { showPrecipitation: true, showWind: false, forecastDays: 3 },
    },
  },
  {
    id: 'personal',
    category: 'workspace',
    label: 'Personal',
    icon: '✅',
    description: 'Goals, daily tasks, capture, recent work, focus, and local conditions.',
    tags: ['3 boards', '7 widgets', 'Life admin'],
    boardCount: 3,
    buildBoards: () => [
      {
        title: 'My Tasks',
        icon: '✅',
        blocks: [
          section('To Do', 0, 300),
          card('Set up your workspace', 0, 344),
          card('Add your first goal', 0, 504),
          card('Review your week', 0, 664),
          section('In Progress', 300, 300),
          card('Keep only what you are actually doing here.', 300, 344),
          section('Done', 600, 300),
          card('Finished tasks build momentum.', 600, 344),
        ],
      },
      {
        title: 'Goals',
        icon: '🎯',
        blocks: [
          section('Personal', 0, 300),
          card('What would make this month feel successful?', 0, 344),
          section('Health', 300, 300),
          card('Movement, meals, sleep, appointments.', 300, 344),
          section('Career', 600, 300),
          card('Skills, applications, networking, next steps.', 600, 344),
        ],
      },
      {
        title: 'Journal',
        icon: '📓',
        blocks: [
          section('Quick Notes', 0, 300),
          card('Capture thoughts before they disappear.', 0, 344),
          section('Weekly Reset', 300, 300),
          card('What worked? What needs less friction?', 300, 344),
        ],
      },
    ],
    widgets: [
      { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 8 },
      { id: 'recent', type: 'recent', x: 0, y: 8, w: 4, h: 4 },
      { id: 'weather', type: 'weather', x: 4, y: 8, w: 4, h: 4 },
      { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture', x: 8, y: 3, w: 4, h: 3 },
      { id: 'focusTimer', type: 'focusTimer', x: 8, y: 6, w: 4, h: 3 },
      { id: 'focus', type: 'focus', x: 8, y: 9, w: 4, h: 3 },
    ],
    widgetSettings: {
      today: { greeting: 'Today', showWeatherSummary: true },
      focus: { title: 'Personal focus', itemCount: 3, filter: 'boards' },
      recent: { title: 'Recently touched', itemCount: 4, filter: 'all' },
      focusTimer: {
        presets: [{ label: '15m', minutes: 15 }, { label: '30m', minutes: 30 }, { label: '60m', minutes: 60 }],
        breakEnabled: true,
        breakMinutes: 5,
        dailyGoal: 2,
      },
      weather: { showHumidity: false, showWind: false, forecastDays: 3 },
    },
  },
  {
    id: 'team',
    category: 'workspace',
    label: 'Team planning',
    icon: '🏗️',
    description: 'Project boards, sprint planning, AI planning, recent work, and team capture.',
    tags: ['3 boards', '7 widgets', 'Sprint mode'],
    boardCount: 3,
    buildBoards: () => [
      {
        title: 'Project Overview',
        icon: '🗺️',
        blocks: [
          section('Backlog', 0, 300),
          card('Ideas, requests, and not-yet-ready work.', 0, 344),
          section('Active', 300, 300),
          card('Current project priorities.', 300, 344),
          section('Review', 600, 300),
          card('Needs feedback or final checks.', 600, 344),
          section('Done', 900, 300),
          card('Shipped work and decisions.', 900, 344),
        ],
      },
      {
        title: 'Sprint Board',
        icon: '🔄',
        blocks: [
          section('To Do', 0, 300),
          card('Define project goals', 0, 344),
          card('Assign first tasks', 0, 504),
          card('Schedule standup', 0, 664),
          section('In Progress', 300, 300),
          card('Only active sprint work belongs here.', 300, 344),
          section('Done', 600, 300),
          card('Completed sprint items.', 600, 344),
        ],
      },
      {
        title: 'Team Resources',
        icon: '📁',
        blocks: [
          section('Docs', 0, 300),
          card('Specs, PRDs, and reference docs.', 0, 344),
          section('Links', 300, 300),
          card('Dashboards, repositories, designs, and tools.', 300, 344),
          section('Notes', 600, 300),
          card('Meeting notes and shared context.', 600, 344),
        ],
      },
    ],
    widgets: [
      { id: 'calendar', type: 'calendar', x: 0, y: 0, w: 8, h: 8 },
      { id: 'proPlanner', type: 'proPlanner', x: 0, y: 8, w: 4, h: 4 },
      { id: 'recent', type: 'recent', x: 4, y: 8, w: 4, h: 4 },
      { id: 'today', type: 'today', x: 8, y: 0, w: 4, h: 3 },
      { id: 'focus', type: 'focus', x: 8, y: 3, w: 4, h: 3 },
      { id: 'quickCapture', type: 'quickCapture', x: 8, y: 6, w: 4, h: 3 },
      { id: 'weather', type: 'weather', x: 8, y: 9, w: 4, h: 3 },
    ],
    widgetSettings: {
      calendar: { weekStartsOn: 'monday', showWeekends: false, showEventTimes: true },
      today: { greeting: 'Team today', showWeatherSummary: false },
      focus: { title: 'Sprint focus', itemCount: 4, filter: 'boards' },
      recent: { title: 'Recent project work', itemCount: 5, filter: 'boards', sortBy: 'lastModified' },
      quickCapture: {
        buttons: [
          { id: 'board', label: 'Board', enabled: true },
          { id: 'page', label: 'Decision', enabled: true },
          { id: 'event', label: 'Meeting', enabled: true },
        ],
      },
      proPlanner: {
        workStart: '09:00',
        workEnd: '17:30',
        focusStyle: 'meetings',
        customInstructions: 'Plan around meetings, blockers, and review work.',
      },
      weather: { showHumidity: false, showPrecipitation: false, showWind: true },
    },
  },
]

const BOARD_ONLY_TEMPLATES: StarterTemplate[] = SINGLE_BOARD_TEMPLATES
  .filter(template => template.id !== 'blank')
  .map(template => ({
    id: `board-${template.id}`,
    category: 'board',
    label: template.name,
    icon: template.icon,
    description: template.description,
    tags: ['1 board', 'No home changes'],
    boardCount: 1,
    buildBoards: () => {
      const built = template.build()
      return [{ title: built.title, icon: built.icon, blocks: built.blocks }]
    },
    widgets: [],
  }))

export const STARTER_TEMPLATES: StarterTemplate[] = [
  ...WORKSPACE_TEMPLATES,
  ...BOARD_ONLY_TEMPLATES,
]
