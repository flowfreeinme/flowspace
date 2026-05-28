import type { AiAction } from '@/lib/aiTypes'

interface BoardContext {
  title: string
  sections: { title: string }[]
  cards: { text: string }[]
}

export interface RouterResult {
  handled: boolean
  message?: string
  actions?: AiAction[]
}

// djb2 hash used so this module stays self-contained
function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function titleCase(s: string) {
  return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

function closestSection(query: string, sections: { title: string }[]): string | null {
  const q = query.toLowerCase()
  const exact = sections.find(s => s.title.toLowerCase() === q)
  if (exact) return exact.title
  const partial = sections.find(s => s.title.toLowerCase().includes(q) || q.includes(s.title.toLowerCase()))
  return partial?.title ?? null
}

export function routeLocally(raw: string, ctx: BoardContext): RouterResult {
  const msg = normalize(raw)

  // ── clear board ────────────────────────────────────────────────────────────
  if (/^(clear|empty|reset|wipe)\s*(the\s*)?(board|everything|all)?$/.test(msg) ||
      /^start (over|fresh|from scratch)$/.test(msg)) {
    return { handled: true, message: 'Board cleared.', actions: [{ type: 'clear_board' }] }
  }

  // ── add section ────────────────────────────────────────────────────────────
  const addSec = msg.match(/^(add|create|new)\s+section\s+(?:called\s+|named\s+)?["']?(.+?)["']?\s*$/)
  if (addSec) {
    const title = titleCase(addSec[2].trim())
    return { handled: true, message: `Added section "${title}".`, actions: [{ type: 'create_section', title }] }
  }

  // ── add card to section ────────────────────────────────────────────────────
  const addCardTo = msg.match(/^(add|create|new)\s+card\s+["']?(.+?)["']?\s+(?:to|in|under)\s+(?:section\s+)?["']?(.+?)["']?\s*$/)
  if (addCardTo) {
    const text = addCardTo[2].trim()
    const secQuery = addCardTo[3].trim()
    const matched = closestSection(secQuery, ctx.sections)
    return {
      handled: true,
      message: `Added card "${text}"${matched ? ` to "${matched}"` : ''}.`,
      actions: [{ type: 'create_card', text, ...(matched ? { section: matched } : {}) }],
    }
  }

  // ── add card (no section) ──────────────────────────────────────────────────
  const addCard = msg.match(/^(add|create|new)\s+card\s+["']?(.+?)["']?\s*$/)
  if (addCard) {
    const text = addCard[2].trim()
    return { handled: true, message: `Added card "${text}".`, actions: [{ type: 'create_card', text }] }
  }


  // ── count cards ────────────────────────────────────────────────────────────
  if (/\bhow many cards\b/.test(msg) || /\bcard count\b/.test(msg) || /\bnumber of cards\b/.test(msg)) {
    const n = ctx.cards.filter(c => c.text.trim()).length
    return { handled: true, message: `There ${n === 1 ? 'is' : 'are'} ${n} card${n !== 1 ? 's' : ''} on this board.` }
  }

  // ── count sections ─────────────────────────────────────────────────────────
  if (/\bhow many sections\b/.test(msg) || /\bsection count\b/.test(msg) || /\bnumber of sections\b/.test(msg)) {
    const n = ctx.sections.length
    return { handled: true, message: `There ${n === 1 ? 'is' : 'are'} ${n} section${n !== 1 ? 's' : ''} on this board.` }
  }

  // ── list sections ──────────────────────────────────────────────────────────
  if (/\b(list|show|what are|what're)\b.{0,15}\bsections\b/.test(msg) || msg === 'sections') {
    if (!ctx.sections.length) return { handled: true, message: 'No sections on this board yet.' }
    return { handled: true, message: `Sections:\n${ctx.sections.map(s => `• ${s.title}`).join('\n')}` }
  }

  // ── list cards ─────────────────────────────────────────────────────────────
  if (/\b(list|show|what are|what're)\b.{0,15}\bcards\b/.test(msg) || msg === 'cards') {
    const cards = ctx.cards.filter(c => c.text.trim())
    if (!cards.length) return { handled: true, message: 'No cards on this board yet.' }
    return { handled: true, message: `Cards:\n${cards.map(c => `• ${c.text}`).join('\n')}` }
  }

  // ── describe / summarise board ─────────────────────────────────────────────
  if (/\b(what('s| is) on|describe|summarize|summarise|overview of)\b.{0,10}\bboard\b/.test(msg) ||
      msg === 'board summary' || msg === 'what\'s here') {
    const sn = ctx.sections.length
    const cn = ctx.cards.filter(c => c.text.trim()).length
    if (!sn && !cn) return { handled: true, message: `"${ctx.title}" is empty.` }
    const secList = sn ? `\nSections: ${ctx.sections.map(s => s.title).join(', ')}` : ''
    return { handled: true, message: `"${ctx.title}" has ${sn} section${sn !== 1 ? 's' : ''} and ${cn} card${cn !== 1 ? 's' : ''}.${secList}` }
  }

  // ── help ───────────────────────────────────────────────────────────────────
  if (msg === 'help' || msg === 'what can you do' || msg === 'commands') {
    return {
      handled: true,
      message: `Here's what you can ask me:\n• "Add section [name]"\n• "Add card [text]"\n• "Add card [text] to [section]"\n• "Clear the board"\n• "List sections / cards"\n• "How many cards / sections"\n• "Describe the board"\n\nFor deeper tasks like reorganizing the whole board, just describe what you want.`,
    }
  }

  // ── delete card ────────────────────────────────────────────────────────────
  const delCard = msg.match(/^(delete|remove)\s+card\s+["']?(.+?)["']?\s*$/)
  if (delCard) {
    const text = delCard[2].trim()
    return { handled: true, message: `Deleted card "${text}".`, actions: [{ type: 'delete_card', text }] }
  }

  // ── delete section ─────────────────────────────────────────────────────────
  const delSec = msg.match(/^(delete|remove)\s+section\s+["']?(.+?)["']?\s*$/)
  if (delSec) {
    const title = delSec[2].trim()
    return { handled: true, message: `Deleted section "${title}".`, actions: [{ type: 'delete_section', title }] }
  }

  // ── rename section ─────────────────────────────────────────────────────────
  const renameSec = msg.match(/^rename\s+section\s+["']?(.+?)["']?\s+to\s+["']?(.+?)["']?\s*$/)
  if (renameSec) {
    const title = renameSec[1].trim()
    const newTitle = titleCase(renameSec[2].trim())
    return { handled: true, message: `Renamed "${title}" to "${newTitle}".`, actions: [{ type: 'rename_section', title, newTitle }] }
  }

  // ── move card ──────────────────────────────────────────────────────────────
  const moveCard = msg.match(/^move\s+card\s+["']?(.+?)["']?\s+to\s+(?:section\s+)?["']?(.+?)["']?\s*$/)
  if (moveCard) {
    const text = moveCard[1].trim()
    const secQuery = moveCard[2].trim()
    const matched = closestSection(secQuery, ctx.sections)
    return {
      handled: true,
      message: `Moved "${text}"${matched ? ` to "${matched}"` : ''}.`,
      actions: [{ type: 'move_card', text, toSection: matched ?? secQuery }],
    }
  }

  return { handled: false }
}
