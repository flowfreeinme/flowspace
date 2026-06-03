import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🗂️',
    title: 'Create a board',
    desc: 'Start with a board or page, then drop cards, sections, files, and drawings anywhere your work needs them.',
  },
  {
    step: '02',
    icon: '📋',
    title: 'Start from a template',
    desc: 'Pick a ready-made template — Sprint, Project Plan, Daily Planner, and more — or drop a Kanban, Flowchart, or Timeline block right onto any canvas.',
  },
  {
    step: '03',
    icon: '☁️',
    title: 'Work from anywhere',
    desc: 'Your workspace saves automatically. Open FlowSpace on desktop or mobile and pick up exactly where you left off.',
  },
]

const SECONDARY_FEATURES = [
  {
    icon: '🎨',
    title: 'Freehand drawing',
    desc: 'Sketch anything directly on a board using the Draw tool. Saved as an image block — keep it, move it, or delete it.',
  },
  {
    icon: '📎',
    title: 'File attachments',
    desc: 'Drop images and files onto any board. Images render inline with a crop tool. Any other file type uploads as a downloadable attachment.',
  },
  {
    icon: '🔗',
    title: 'Invite & access control',
    desc: 'Share boards by email with a single click. Remove access at any time — changes take effect immediately.',
  },
  {
    icon: '🎛️',
    title: 'Drag-and-arrange dashboard',
    desc: 'Eight built-in widgets — resize from any corner and drag to rearrange. Each has its own settings: titles, filters, timer presets, and more.',
  },
  {
    icon: '🔀',
    title: 'Workflow blocks',
    desc: 'Kanban, Flowchart, and Timeline as resizable canvas blocks inside any board. Drag cards, connect nodes, or track milestones — no separate app needed.',
  },
  {
    icon: '🚀',
    title: 'Board templates',
    desc: 'Start from a Sprint, Roadmap, Daily Planner, or Brainstorm template. One click from the sidebar, command palette, or new board screen.',
  },
]

const CORE_FEATURES = [
  'Unlimited boards, cards & sections',
  'Real-time collaboration & presence',
  'Built-in calendar (Google + ICS)',
  'Workflow blocks: Kanban, Flowchart, Timeline',
  'Board templates — start in one click',
  'Folders, favorites, recent boards & search',
  'Freehand drawing & file attachments',
  'Drag-and-arrange home dashboard (8 widgets)',
  'Focus timer with custom presets',
  'Invite & access control',
  'Mobile-ready — works on any device',
]

const PRO_FEATURES = [
  'Everything in Essentials',
  'AI day planner for calendar + workspace context',
  'AI board organizer for messy notes and projects',
  'Unlimited AI discussions per day',
  'Priority support',
  'Early access to new productivity widgets',
]

const FAQ = [
  {
    q: 'What is FlowSpace?',
    a: 'FlowSpace is a visual workspace built around boards, cards, and real-time collaboration. It combines a freeform canvas, built-in workflow blocks (Kanban, Flowchart, Timeline), a calendar, drawing tools, file attachments, and an AI assistant — all in one place.',
  },
  {
    q: 'What are workflow blocks?',
    a: 'Workflow blocks are Kanban boards, Flowcharts, and Timeline views you can embed directly on any board canvas as resizable blocks. Drop one anywhere, drag cards between columns, connect nodes, or track milestones — without switching to a separate app.',
  },
  {
    q: 'Can FlowSpace replace my current task and project tools?',
    a: 'For most workflows, yes. Boards handle project tracking and daily tasks. Kanban and timeline blocks cover structured project views. The built-in calendar handles scheduling. File attachments mean no context-switching for documents. And real-time collaboration replaces separate team tools.',
  },
  {
    q: 'How does the AI assistant work?',
    a: 'Right-click any board and choose "Ask AI." You can ask it questions about your work, or tell it to reorganize and reformat your board — it will create sections and cards automatically. The AI is powered by Claude and understands your board\'s context.',
  },
  {
    q: 'How does board sharing work?',
    a: 'Right-click any board in your sidebar and choose Share. Enter the email address of the person you want to collaborate with. They\'ll get an instant notification to accept or decline. Once accepted, the board appears in their sidebar and both of you can edit it live.',
  },
  {
    q: 'Can I customize the home dashboard?',
    a: 'Yes — every widget is resizable from any corner and draggable to any position on the grid. Click the gear icon on any widget to change its title, adjust filters, set work hours, build custom focus timer presets, choose temperature units, and more.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'Yes. FlowSpace is fully responsive and works in any modern mobile browser. The mobile layout has a dedicated navigation drawer and tab bar optimized for touch.',
  },
  {
    q: 'Is my data secure?',
    a: 'Every workspace is private to your account, protected by row-level security — no one else can read your data. Passwords are never stored in plain text, and you can enable two-factor authentication in your account settings.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-surface-3 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-surface-1 transition-colors"
      >
        <span className="text-sm font-medium text-white pr-4">{q}</span>
        <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

interface CalloutProps {
  icon: string
  title: string
  body: string
  badge?: string
  flip?: boolean
  mockup: React.ReactNode
}

function FeatureCallout({ icon, title, body, badge, flip = false, mockup }: CalloutProps) {
  return (
    <div className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-10 lg:gap-16 items-center py-14 border-b border-surface-3/50 last:border-0`}>
      <div className="flex-1">
        <span className="text-3xl mb-4 block">{icon}</span>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
          {badge && (
            <span className="text-[10px] font-semibold bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-gray-400 leading-relaxed text-[15px]">{body}</p>
      </div>
      <div className="flex-1 w-full bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
        {mockup}
      </div>
    </div>
  )
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-surface-0 text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-white tracking-tight">✦ FlowSpace</span>
        <div className="flex items-center gap-4">
          <a
            href="#how-it-works"
            className="text-sm text-gray-500 hover:text-white transition-colors hidden sm:block"
          >
            How it works
          </a>
          <button
            onClick={onGetStarted}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </button>
          <button
            onClick={onGetStarted}
            className="text-sm bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs font-medium px-3 py-1.5 rounded-full mb-10">
          ✦ Boards · Kanban · Calendar · AI
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-[1.08] mb-6 tracking-tight">
          One workspace.<br />
          <span className="text-accent">Everything in it.</span>
        </h1>
        <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Boards, Kanban, Flowchart, Timeline, calendar, and AI — all in one place.
          Start from a template or build from scratch. No app switching.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-10 py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
          >
            Create my workspace →
          </button>
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto border border-surface-4 hover:border-surface-3 text-gray-300 hover:text-white px-10 py-3.5 rounded-xl text-sm font-medium transition-colors"
          >
            Sign in
          </button>
        </div>
        {/* Quick perks */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {['Unlimited boards & cards', 'Kanban, Flowchart & Timeline', 'Built-in calendar', 'Board templates'].map(p => (
            <span key={p} className="flex items-center gap-1.5 text-xs text-gray-500">
              <Check size={11} className="text-accent shrink-0" />
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* App preview */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="relative">
          {/* Glow */}
          <div className="absolute inset-x-0 -top-10 h-40 bg-accent/10 blur-3xl -z-10 rounded-full" />
          {/* Two-panel wrapper */}
          <div className="flex items-center gap-3">
            {/* Desktop panel */}
            <div className="flex-1 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 min-w-0">
              {/* Tab bar */}
              <div className="flex items-center h-10 bg-surface-1 border-b border-surface-3 px-3 gap-2">
                <div className="flex gap-1.5 mr-2 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                {['🏠', '🚀 Project Plan', '✅ My Tasks', '📅 Calendar'].map((t, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs shrink-0 ${
                      i === 1 ? 'bg-surface-2 text-white border border-surface-3' : 'text-gray-600'
                    }`}
                  >
                    {t}
                  </div>
                ))}
                <div className="ml-auto flex items-center gap-1.5 pr-1 shrink-0">
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-surface-1">M</div>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-surface-1">A</div>
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-surface-1">J</div>
                </div>
              </div>
              {/* Body */}
              <div className="flex h-72">
                {/* Sidebar */}
                <div className="w-44 bg-surface-1 border-r border-surface-3 p-3 shrink-0 relative">
                  <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-2">Boards</div>
                  {[
                    { label: '🚀 Project Plan', active: true },
                    { label: '✅ My Tasks', active: false },
                    { label: '📓 My Notes', active: false },
                    { label: '💡 Ideas', active: false },
                  ].map((p, i) => (
                    <div key={i} className={`text-xs px-2 py-1.5 rounded-lg truncate mb-0.5 ${p.active ? 'bg-accent/20 text-accent' : 'text-gray-600'}`}>
                      {p.label}
                    </div>
                  ))}
                  <div className="border-t border-surface-3/50 my-2 mx-1" />
                  <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-1.5">Shared</div>
                  <div className="text-xs px-2 py-1.5 rounded-lg truncate text-gray-600">🎯 Design Sprint</div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-[9px] font-bold">M</div>
                    <div className="text-[9px] text-gray-600">michael</div>
                  </div>
                </div>
                {/* Canvas */}
                <div className="flex-1 p-4 relative overflow-hidden bg-surface-0/40">
                  {/* Backlog column */}
                  <div className="absolute top-4 left-4">
                    <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Backlog</div>
                    <div className="space-y-2">
                      <div className="w-28 bg-surface-2 border border-surface-3 rounded-xl p-2.5">
                        <div className="h-1.5 w-20 bg-surface-4 rounded mb-1" />
                        <div className="h-1.5 w-14 bg-surface-4 rounded opacity-60 mb-1.5" />
                        <span className="text-[7px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">design</span>
                      </div>
                      <div className="w-28 bg-surface-2 border border-surface-3 rounded-xl p-2.5 opacity-60">
                        <div className="h-1.5 w-16 bg-surface-4 rounded mb-1" />
                        <div className="h-1.5 w-12 bg-surface-4 rounded opacity-60" />
                      </div>
                    </div>
                  </div>
                  {/* In Progress column */}
                  <div className="absolute top-4 left-[136px]">
                    <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">In Progress</div>
                    <div className="space-y-2">
                      <div className="w-32 bg-surface-2 border border-accent/40 rounded-xl p-2.5 relative">
                        <div className="h-1.5 w-24 bg-surface-4 rounded mb-1" />
                        <div className="h-1.5 w-16 bg-surface-4 rounded opacity-60 mb-1.5" />
                        <span className="text-[7px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">active</span>
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 ring-1 ring-surface-2 flex items-center justify-center text-white text-[7px] font-bold">A</div>
                      </div>
                      <div className="w-32 bg-surface-2 border border-surface-3 rounded-xl p-2.5 relative">
                        <div className="h-1.5 w-20 bg-surface-4 rounded mb-1" />
                        <div className="h-1.5 w-12 bg-surface-4 rounded opacity-60" />
                        <div className="absolute -top-1.5 -right-1.5 bg-surface-1 border border-accent/40 rounded-full w-4 h-4 flex items-center justify-center text-accent text-[8px]">✦</div>
                      </div>
                    </div>
                  </div>
                  {/* Done column */}
                  <div className="absolute top-4 right-3">
                    <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Done</div>
                    <div className="space-y-2">
                      {[{ w: 112, lines: [80, 56] }, { w: 112, lines: [64, 40] }].map((c, i) => (
                        <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-2.5 opacity-35" style={{ width: c.w }}>
                          <div className="h-1.5 bg-surface-4 rounded mb-1" style={{ width: c.lines[0] }} />
                          <div className="h-1.5 bg-surface-4 rounded opacity-60" style={{ width: c.lines[1] }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* AI panel */}
                  <div className="absolute bottom-3 right-3 bg-surface-2 border border-accent/30 rounded-xl px-3 py-2 shadow-xl flex items-start gap-2 w-48">
                    <div className="text-accent text-[10px] mt-0.5 shrink-0">✦</div>
                    <div className="min-w-0">
                      <div className="h-1.5 w-28 bg-surface-4 rounded mb-1.5" />
                      <div className="h-1.5 w-36 bg-accent/25 rounded mb-1" />
                      <div className="h-1.5 w-24 bg-accent/25 rounded opacity-70" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Mobile panel */}
            <div className="hidden sm:flex w-36 shrink-0 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 flex-col -ml-3 self-center z-10" style={{ height: 260 }}>
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-3 shrink-0">
                <span className="text-sm text-gray-400 font-medium leading-none">≡</span>
                <span className="text-[8px] font-bold text-white tracking-tight">✦ FlowSpace</span>
                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white text-[7px] font-bold">M</div>
              </div>
              {/* Content */}
              <div className="flex-1 p-2 overflow-hidden">
                <div className="text-[7px] font-semibold text-gray-600 uppercase tracking-widest mb-2">🚀 Project Plan</div>
                <div className="space-y-1.5">
                  <div className="bg-surface-2 border border-accent/40 rounded-lg p-2">
                    <div className="h-1.5 w-20 bg-accent/40 rounded mb-1" />
                    <div className="h-1.5 w-14 bg-surface-4 rounded opacity-60" />
                  </div>
                  <div className="bg-surface-2 border border-surface-3 rounded-lg p-2">
                    <div className="h-1.5 w-16 bg-surface-4 rounded mb-1" />
                    <div className="h-1.5 w-10 bg-surface-4 rounded opacity-60" />
                  </div>
                  <div className="bg-surface-2 border border-surface-3 rounded-lg p-2 opacity-50">
                    <div className="h-1.5 w-12 bg-surface-4 rounded mb-1" />
                    <div className="h-1.5 w-8 bg-surface-4 rounded opacity-60" />
                  </div>
                </div>
              </div>
              {/* Tab bar */}
              <div className="border-t border-surface-3 flex items-center justify-around py-2.5 px-2 shrink-0">
                {['🏠', '📅', '🗂️', '⚙️'].map((icon, i) => (
                  <span key={i} className={`text-[12px] ${i === 2 ? '' : 'opacity-25'}`}>{icon}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch border border-surface-3 rounded-2xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-surface-3">
          {[
            { val: '∞', label: 'Boards & cards' },
            { val: 'Live', label: 'Real-time sync' },
            { val: 'Desktop + Mobile', label: 'Works everywhere' },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center py-7 px-8 bg-surface-1/50">
              <p className="text-2xl font-bold text-accent mb-1">{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 pb-28 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
          How FlowSpace works
        </h2>
        <p className="text-gray-500 text-center mb-14 text-base">
          From blank canvas to organized workspace in minutes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(s => (
            <div key={s.step} className="bg-surface-1 border border-surface-3 rounded-2xl p-6 relative">
              <p className="text-5xl font-black text-accent/20 leading-none mb-4 select-none">{s.step}</p>
              <span className="text-2xl mb-3 block">{s.icon}</span>
              <h3 className="font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature callouts */}
      <section className="px-6 pb-10 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
          Built around how you actually work
        </h2>
        <p className="text-gray-500 text-center mb-16 text-base">
          Everything you need in one place — no app switching, no duct tape.
        </p>

        <FeatureCallout
          icon="🗂️"
          title="See all your work at once"
          body="FlowSpace's freeform canvas puts everything in front of you. Drag cards anywhere, group them into sections, draw connections — your layout, your rules. No rigid columns forcing your thinking into boxes."
          mockup={
            <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
              <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">In Progress</div>
              <div className="flex gap-2.5">
                {[
                  { w: 120, accent: false },
                  { w: 140, accent: true },
                  { w: 108, accent: false },
                ].map((c, i) => (
                  <div key={i} className={`bg-surface-2 border ${c.accent ? 'border-accent/40' : 'border-surface-3'} rounded-xl p-2.5`} style={{ width: c.w }}>
                    <div className="h-2 bg-surface-4 rounded mb-1.5" style={{ width: c.w * 0.75 }} />
                    <div className="h-2 bg-surface-4 rounded opacity-60" style={{ width: c.w * 0.5 }} />
                  </div>
                ))}
              </div>
              {/* Lasso ring */}
              <div className="absolute top-12 left-5 w-40 h-20 border-2 border-accent/50 rounded-[60%_40%_50%_50%/40%_60%_40%_60%] pointer-events-none" />
            </div>
          }
        />

        <FeatureCallout
          icon="📋"
          title="Kanban, Flowchart, and Timeline — inside your board"
          body="Drop a workflow block anywhere on the canvas. Drag cards between Kanban columns, draw connections in a Flowchart, or track milestones on a Timeline — all without leaving the board you're already in."
          flip
          mockup={
            <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
              {/* Kanban block frame */}
              <div className="absolute inset-4 bg-surface-1 border border-accent/30 rounded-xl overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 border-b border-surface-3 bg-surface-2/60">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">Kanban block</span>
                  <div className="flex gap-1">
                    {['bg-accent/40', 'bg-surface-4', 'bg-surface-4'].map((c, i) => (
                      <div key={i} className={`text-[7px] px-1.5 py-0.5 rounded ${i === 0 ? 'bg-accent/20 text-accent' : 'bg-surface-3 text-gray-600'}`}>
                        {['Kanban', 'Flow', 'Timeline'][i]}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2.5 p-3">
                  {[
                    { label: 'Todo', cards: [72, 60], color: 'border-surface-3' },
                    { label: 'In Progress', cards: [80], color: 'border-accent/40' },
                    { label: 'Done', cards: [64, 48], color: 'border-surface-3', dim: true },
                  ].map((col, ci) => (
                    <div key={ci} className="flex-1 min-w-0">
                      <div className="text-[7px] font-semibold text-gray-600 uppercase tracking-widest mb-1.5">{col.label}</div>
                      <div className="space-y-1.5">
                        {col.cards.map((w, i) => (
                          <div key={i} className={`bg-surface-2 border ${col.color} rounded-lg p-1.5 ${col.dim ? 'opacity-40' : ''}`}>
                            <div className="h-1 bg-surface-4 rounded mb-1" style={{ width: w * 0.8 }} />
                            <div className="h-1 bg-surface-4 rounded opacity-60" style={{ width: w * 0.5 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Resize handle hint */}
              <div className="absolute bottom-5 right-5 w-3 h-3 bg-accent rounded-sm border border-surface-0 shadow-md" />
            </div>
          }
        />

        <FeatureCallout
          icon="🚀"
          title="Go from blank to organized in one click"
          body="Pick a ready-made template — Sprint Planning, Project Roadmap, Daily Planner, Brainstorm Board, and more. It lands in your workspace fully structured, ready to customize. Accessible from the sidebar, command palette (⌘K), or the new board screen."
          mockup={
            <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
              {/* Template picker */}
              <div className="absolute inset-3 bg-surface-1 border border-surface-3 rounded-xl overflow-hidden shadow-xl">
                <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-white">Choose a template</span>
                  <div className="w-16 h-3 bg-surface-3 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  {[
                    { label: '🚀 Sprint', accent: true },
                    { label: '🗺️ Roadmap', accent: false },
                    { label: '📅 Daily', accent: false },
                    { label: '💡 Brainstorm', accent: false },
                    { label: '✅ Tasks', accent: false },
                    { label: '📊 Review', accent: false },
                  ].map((t, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-2 border ${t.accent ? 'border-accent/50 bg-accent/10' : 'border-surface-3 bg-surface-2'}`}
                    >
                      <div className="text-[8px] font-medium text-gray-400 leading-tight">{t.label}</div>
                      <div className="mt-1.5 space-y-1">
                        <div className={`h-1 rounded ${t.accent ? 'bg-accent/40' : 'bg-surface-4'}`} style={{ width: '80%' }} />
                        <div className="h-1 bg-surface-4 rounded opacity-50" style={{ width: '60%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
        />

        <FeatureCallout
          icon="⚡"
          title="Your team, in the same room"
          body="Share any board and edit it together live. Presence avatars show who's active. Changes appear the moment they happen — no 'did you see my update?' messages."
          flip
          mockup={
            <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
              <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Design Sprint</div>
              <div className="flex gap-2.5">
                {[
                  { w: 120, avatar: 'M', color: 'bg-purple-500' },
                  { w: 130, avatar: 'A', color: 'bg-green-500' },
                  { w: 110, avatar: 'J', color: 'bg-blue-500' },
                ].map((c, i) => (
                  <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-2.5 relative" style={{ width: c.w }}>
                    <div className="h-2 bg-surface-4 rounded mb-1.5" style={{ width: c.w * 0.7 }} />
                    <div className="h-2 bg-surface-4 rounded opacity-60" style={{ width: c.w * 0.5 }} />
                    <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${c.color} ring-2 ring-surface-1 flex items-center justify-center text-white text-[8px] font-bold`}>{c.avatar}</div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-4 right-4 bg-surface-2 border border-surface-3 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] text-gray-400">3 people online</span>
              </div>
            </div>
          }
        />

        <FeatureCallout
          icon="📅"
          title="Deadlines that live with your work"
          body="Month, week, and day views in one place. Connect Google Calendar or import any ICS file. Your events stay next to your boards — no tab switching."
          mockup={
            <div className="p-5 h-52 overflow-hidden bg-surface-0/40">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-[8px] text-gray-600 text-center font-semibold">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 1
                  const isToday = day === 14
                  const hasEvent = [2, 7, 14, 16, 21, 22, 28].includes(day)
                  const eventColor = [7, 16].includes(day) ? 'bg-accent' : 'bg-blue-500'
                  return (
                    <div key={i} className={`aspect-square rounded flex flex-col items-center justify-start pt-0.5 ${isToday ? 'bg-accent/20 border border-accent/40' : ''}`}>
                      <span className={`text-[8px] ${isToday ? 'text-accent font-bold' : day < 0 || day > 30 ? 'text-gray-700' : 'text-gray-500'}`}>
                        {day >= 0 && day <= 30 ? day + 1 : ''}
                      </span>
                      {hasEvent && day >= 0 && <div className={`w-1 h-1 rounded-full mt-0.5 ${eventColor}`} />}
                    </div>
                  )
                })}
              </div>
            </div>
          }
        />

        <FeatureCallout
          icon="🎛️"
          title="A home screen built around your day"
          body="Eight widgets — Today, Focus Queue, Recent Work, Calendar, Weather, Quick Capture, Focus Timer, and AI Day Planner. Drag to rearrange, resize from any corner, and tweak each widget's settings independently. Your layout saves automatically."
          flip
          mockup={
            <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
              <div className="grid grid-cols-2 gap-2 h-full">
                {/* Today widget */}
                <div className="bg-surface-2 border border-surface-3 rounded-xl p-3 relative cursor-grab">
                  <div className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Today</div>
                  <div className="h-2 w-24 bg-accent/30 rounded mb-1.5" />
                  <div className="h-1.5 w-16 bg-surface-4 rounded mb-1 opacity-60" />
                  <div className="h-1.5 w-20 bg-surface-4 rounded opacity-40" />
                  <div className="absolute top-2 right-2 w-4 h-4 rounded bg-surface-3 flex items-center justify-center opacity-60">
                    <span className="text-[8px] text-gray-400">⚙</span>
                  </div>
                </div>
                {/* Focus Queue widget */}
                <div className="bg-surface-2 border border-accent/30 rounded-xl p-3 relative" style={{ transform: 'translate(4px,-4px)', boxShadow: '0 8px 20px rgba(124,106,247,0.25)' }}>
                  <div className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Focus Queue</div>
                  {[28, 22, 18].map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0" />
                      <div className="h-1.5 bg-surface-4 rounded opacity-60" style={{ width: w * 2.5 }} />
                    </div>
                  ))}
                  <div className="absolute top-2 right-2 w-4 h-4 rounded bg-surface-3 flex items-center justify-center opacity-60">
                    <span className="text-[8px] text-gray-400">⚙</span>
                  </div>
                  {/* drag hint */}
                  <div className="absolute bottom-2 left-2 text-[7px] text-accent/50">drag to move</div>
                </div>
                {/* Weather widget */}
                <div className="bg-surface-2 border border-surface-3 rounded-xl p-3 relative cursor-grab">
                  <div className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Weather</div>
                  <div className="text-lg font-bold text-white leading-none mb-1">72°</div>
                  <div className="h-1.5 w-14 bg-surface-4 rounded opacity-40" />
                  <div className="absolute top-2 right-2 w-4 h-4 rounded bg-surface-3 flex items-center justify-center opacity-60">
                    <span className="text-[8px] text-gray-400">⚙</span>
                  </div>
                </div>
                {/* Focus Timer widget */}
                <div className="bg-surface-2 border border-surface-3 rounded-xl p-3 relative cursor-grab">
                  <div className="text-[8px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Focus Timer</div>
                  <div className="flex gap-1 mb-2">
                    {['25m', '50m', '90m'].map((p, i) => (
                      <div key={i} className={`rounded px-1.5 py-0.5 text-[7px] ${i === 0 ? 'bg-accent/20 text-accent' : 'bg-surface-3 text-gray-600'}`}>{p}</div>
                    ))}
                  </div>
                  <div className="h-1.5 w-10 bg-surface-4 rounded opacity-40" />
                  <div className="absolute top-2 right-2 w-4 h-4 rounded bg-surface-3 flex items-center justify-center opacity-60">
                    <span className="text-[8px] text-gray-400">⚙</span>
                  </div>
                </div>
              </div>
              {/* resize handle hint */}
              <div className="absolute bottom-2 right-2 w-3 h-3 bg-accent rounded-sm border border-surface-0 shadow-md" />
            </div>
          }
        />

        <FeatureCallout
          icon="✦"
          title="An assistant that knows your board"
          body="Right-click any board and ask the AI to reorganize it, generate a full plan from scratch, or answer a question about your work. It reads your sections and cards — so its suggestions actually fit."
          badge="Pro"
          flip
          mockup={
            <div className="p-5 h-52 relative overflow-hidden bg-surface-0/40">
              <div className="absolute inset-x-5 bottom-4 bg-surface-2 border border-accent/30 rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-3">
                  <span className="text-accent text-sm">✦</span>
                  <span className="text-[10px] font-semibold text-white">Ask AI</span>
                </div>
                <div className="text-[9px] text-gray-500 mb-2">Reorganize this board into priority order</div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-accent/25 rounded" />
                  <div className="h-1.5 w-4/5 bg-accent/25 rounded" />
                  <div className="h-1.5 w-3/5 bg-accent/20 rounded opacity-70" />
                </div>
              </div>
              <div className="absolute top-4 left-5 flex gap-2">
                {[80, 100, 72].map((w, i) => (
                  <div key={i} className="bg-surface-2 border border-surface-3 rounded-xl p-2" style={{ width: w }}>
                    <div className="h-1.5 bg-surface-4 rounded mb-1" style={{ width: w * 0.75 }} />
                    <div className="h-1.5 bg-surface-4 rounded opacity-60" style={{ width: w * 0.5 }} />
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </section>

      {/* Secondary features */}
      <section className="px-6 pb-28 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">
          And everything else you need
        </h2>
        <p className="text-gray-500 text-center mb-10 text-sm">
          No add-ons. No integrations. Built in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECONDARY_FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-surface-1 border border-surface-3 rounded-2xl p-5 hover:border-accent/30 transition-all duration-200"
            >
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-28 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
          Two plans. Start for free.
        </h2>
        <p className="text-gray-500 text-center mb-14 text-base">
          Essentials gets users organized. Pro gives them AI help when they want momentum.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Essentials */}
          <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Essentials</p>
              <p className="text-2xl font-bold text-white leading-snug">Everything you need to get started</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {CORE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Check size={13} className="text-accent shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={onGetStarted}
              className="w-full py-3 border border-surface-4 hover:border-accent/40 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              Create my workspace →
            </button>
          </div>

          {/* Pro */}
          <div className="bg-surface-1 border border-accent/30 rounded-2xl p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl tracking-wide">
              COMING SOON
            </div>
            <div className="mb-6">
              <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-2">Pro</p>
              <p className="text-2xl font-bold text-white leading-snug">For users who want AI planning built in</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Check size={13} className="text-accent shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full py-3 bg-accent/20 text-accent/60 rounded-xl text-sm font-medium cursor-not-allowed"
            >
              Launching soon
            </button>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-28 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-3 tracking-tight">
          Frequently asked questions
        </h2>
        <p className="text-gray-500 text-center mb-12">
          Everything you need to know about FlowSpace.
        </p>
        <div className="space-y-2">
          {FAQ.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-28 max-w-5xl mx-auto">
        <div className="bg-surface-1 border border-surface-3 rounded-3xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* Left — brand & perks */}
            <div className="p-10 lg:p-14 border-b border-surface-3 lg:border-b-0 lg:border-r">
              <p className="text-2xl font-bold text-white tracking-tight mb-3">
                Ready to make your day less scattered?
              </p>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Create your account in seconds and start building. Everything saves automatically — pick up from any device, any time.
              </p>
              <ul className="space-y-3">
                {[
                  '✦ Boards, Kanban, Flowchart, Timeline, and AI — all in one place.',
                  '✦ Start from a template or a blank canvas in seconds.',
                  '✦ Drag-and-arrange home dashboard with 8 configurable widgets.',
                ].map(line => (
                  <li key={line} className="text-sm text-gray-300">{line}</li>
                ))}
              </ul>
            </div>

            {/* Right — action */}
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <span className="text-4xl mb-6 block">✦</span>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight leading-snug">
                One workspace.<br />Everything in it.
              </h2>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Join FlowSpace and build your first board in seconds. Everything is ready the moment you sign up.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onGetStarted}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent/20 text-center"
                >
                  Create my workspace →
                </button>
                <button
                  onClick={onGetStarted}
                  className="flex-1 border border-surface-4 hover:border-surface-3 text-gray-400 hover:text-white px-6 py-3.5 rounded-xl text-sm font-medium transition-colors text-center"
                >
                  Sign in
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-3 px-8 py-6 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-700">
        <span className="font-medium">✦ FlowSpace · flowspaced.com</span>
        <div className="flex items-center gap-5">
          <span className="hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
          <a href="mailto:supportinbox@flowspaced.com" className="hover:text-gray-400 transition-colors">supportinbox@flowspaced.com</a>
          <span>© {new Date().getFullYear()} FlowSpace. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
