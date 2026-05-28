import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TimelineBlock from './TimelineBlock'
import type { TimelineData } from '../../lib/workflowBlocks'

describe('TimelineBlock', () => {
  it('renders timeline entries as dated schedule rows', () => {
    const data: TimelineData = {
      x: 0,
      y: 0,
      width: 520,
      height: 360,
      dateRange: { start: '2026-05-01', end: '2026-05-31' },
      groups: [{
        id: 'schedule',
        label: 'Schedule',
        bars: [{
          id: 'event-1',
          label: 'Studio review',
          start: '2026-05-21',
          end: '2026-05-21',
          startTime: '09:30',
          endTime: '10:15',
          location: 'Library',
          color: '#7c6af7',
        }],
      }],
    }

    const html = renderToStaticMarkup(
      <TimelineBlock
        block={{ id: 'timeline', type: 'timeline', content: JSON.stringify(data) }}
        selected={false}
        zoom={1}
        onDragStart={() => {}}
        onResizeHandleMouseDown={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    )

    expect(html).toContain('Studio review')
    expect(html).toContain('Library')
    expect(html).toMatch(/9:30|09:30/)
  })
})
