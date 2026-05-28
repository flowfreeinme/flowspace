import { v4 as uuid } from 'uuid'
import type { Block } from '@/types'

interface Template {
  id: string
  name: string
  description: string
  icon: string
  build: () => { title: string; icon: string; blocks: Block[] }
}

const COL = 320
const X0  = 0
const Y0  = 260
const CARD_H = 170
const CARD_W = 280
const CARD_HEIGHT = 140

function section(title: string, col: number): Block {
  return { id: uuid(), type: 'section', content: JSON.stringify({ title, x: X0 + col * COL, y: Y0 }) }
}

function card(text: string, col: number, row: number): Block {
  return {
    id: uuid(),
    type: 'textbox',
    content: JSON.stringify({ text, x: X0 + col * COL, y: Y0 + 50 + row * CARD_H, width: CARD_W, height: CARD_HEIGHT }),
  }
}

export const TEMPLATES: Template[] = [
  {
    id: 'todo',
    name: 'To-do List',
    description: 'Track tasks across Priority, Backlog, and Done',
    icon: '✅',
    build: () => ({
      title: 'To-do List',
      icon: '✅',
      blocks: [
        section('🔥 Priority', 0),
        card('', 0, 0),
        card('', 0, 1),
        section('📋 Backlog', 1),
        card('', 1, 0),
        card('', 1, 1),
        card('', 1, 2),
        section('✅ Done', 2),
      ],
    }),
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Agenda, notes, and action items',
    icon: '🗒️',
    build: () => ({
      title: 'Meeting Notes',
      icon: '🗒️',
      blocks: [
        section('📋 Agenda', 0),
        card('', 0, 0),
        card('', 0, 1),
        section('📝 Notes', 1),
        card('', 1, 0),
        section('✅ Action Items', 2),
        card('', 2, 0),
        card('', 2, 1),
      ],
    }),
  },
  {
    id: 'journal',
    name: 'Daily Journal',
    description: 'Reflect on your day',
    icon: '📓',
    build: () => ({
      title: `Journal — ${new Date().toLocaleDateString()}`,
      icon: '📓',
      blocks: [
        section('🌅 Morning Intentions', 0),
        card('Today I want to…', 0, 0),
        section('✅ Today\'s Goals', 1),
        card('', 1, 0),
        card('', 1, 1),
        section('💭 Reflections', 2),
        card('', 2, 0),
        section('🙏 Grateful For', 3),
        card('', 3, 0),
        card('', 3, 1),
      ],
    }),
  },
  {
    id: 'project',
    name: 'Project Plan',
    description: 'Goals, milestones, risks, and tasks',
    icon: '🚀',
    build: () => ({
      title: 'Project Plan',
      icon: '🚀',
      blocks: [
        section('🎯 Goals', 0),
        card('', 0, 0),
        section('📅 Milestones', 1),
        card('', 1, 0),
        card('', 1, 1),
        section('⚠️ Risks', 2),
        card('', 2, 0),
        section('✅ Tasks', 3),
        card('', 3, 0),
        card('', 3, 1),
      ],
    }),
  },
  {
    id: 'weekly',
    name: 'Weekly Review',
    description: 'Reflect and plan ahead',
    icon: '📅',
    build: () => ({
      title: `Week of ${new Date().toLocaleDateString()}`,
      icon: '📅',
      blocks: [
        section('🏆 Wins This Week', 0),
        card('', 0, 0),
        card('', 0, 1),
        section('📈 What To Improve', 1),
        card('', 1, 0),
        section('🎯 Focus Next Week', 2),
        card('', 2, 0),
        card('', 2, 1),
        section('💡 Ideas & Notes', 3),
        card('', 3, 0),
      ],
    }),
  },
  {
    id: 'blank',
    name: 'Blank board',
    description: 'Start from scratch',
    icon: '📄',
    build: () => ({ title: 'Untitled', icon: '📄', blocks: [] }),
  },
]
