import { useState, useRef, useEffect } from 'react'
import { X, GripVertical, Plus, Link2, Pencil, Trash2, Copy } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import {
  addFlowchartNode,
  clientPointToFlowchartPosition,
  connectFlowchartNodes,
  deleteFlowchartNode,
  FLOWCHART_NODE_H,
  FLOWCHART_NODE_W,
  parseFlowchart,
  updateFlowchartNode,
} from '@/lib/workflowBlocks'
import type { FlowchartData, FlowchartNode, FlowchartBounds } from '@/lib/workflowBlocks'
import type { Block } from '@/types'

const CORNER_HANDLES = [
  { id: 'nw', style: { left: -4, top: -4, cursor: 'nw-resize' } },
  { id: 'ne', style: { right: -4, top: -4, cursor: 'ne-resize' } },
  { id: 'se', style: { right: -4, bottom: -4, cursor: 'se-resize' } },
  { id: 'sw', style: { left: -4, bottom: -4, cursor: 'sw-resize' } },
] as const

const NODE_COLORS: Record<FlowchartNode['type'], string> = {
  start: '#22c55e',
  end: '#ef4444',
  decision: '#f59e0b',
  process: '#7c6af7',
}

const NODE_BACKGROUNDS: Record<FlowchartNode['type'], string> = {
  start: 'linear-gradient(180deg, #1f3129 0%, #17241f 100%)',
  end: 'linear-gradient(180deg, #352020 0%, #251818 100%)',
  decision: 'linear-gradient(180deg, #332916 0%, #241e12 100%)',
  process: 'linear-gradient(180deg, #262737 0%, #1b1c27 100%)',
}

interface FlowchartBlockProps {
  block: Block
  selected: boolean
  zoom: number
  onDragStart: (e: React.MouseEvent) => void
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string) => void
  onUpdate: (content: string) => void
  onDelete: () => void
}

export default function FlowchartBlock({
  block, selected, zoom,
  onDragStart, onResizeHandleMouseDown, onUpdate, onDelete,
}: FlowchartBlockProps) {
  const [data, setData] = useState<FlowchartData>(() => parseFlowchart(block.content))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef(data)
  const [menuOpen, setMenuOpen] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<{ id: string; ox: number; oy: number; startX: number; startY: number } | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const next = parseFlowchart(block.content)
    setData(next)
    dataRef.current = next
    setSelectedNodeId(id => id && next.nodes.some(node => node.id === id) ? id : null)
    setConnectFrom(id => id && next.nodes.some(node => node.id === id) ? id : null)
  }, [block.content])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function save(next: FlowchartData) {
    setData(next)
    dataRef.current = next
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(JSON.stringify(dataRef.current)), 300)
  }

  function getBodyBounds(): FlowchartBounds {
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return dataRef.current
    const scale = zoom || 1
    return { width: rect.width / scale, height: rect.height / scale }
  }

  function addNode(type: FlowchartNode['type'] = 'process', x?: number, y?: number) {
    const current = dataRef.current
    const id = uuid()
    save(addFlowchartNode(current, { type, x, y }, () => id, getBodyBounds()))
    setSelectedNodeId(id)
    setEditingNodeId(id)
    setConnectMode(false)
    setConnectFrom(null)
    setMenuOpen(false)
  }

  function addNodeFromDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if ((e.target as HTMLElement).closest('[data-fc-node],[data-fc-control]')) return
    const rect = bodyRef.current?.getBoundingClientRect()
    if (!rect) return
    const point = clientPointToFlowchartPosition(e.clientX, e.clientY, rect, zoom)
    addNode('process', point.x, point.y)
  }

  function updateNodeLabel(id: string, label: string) {
    const current = dataRef.current
    const fallback = current.nodes.find(node => node.id === id)?.label ?? 'Step'
    save(updateFlowchartNode(current, id, { label: label.trim() || fallback }, getBodyBounds()))
    setEditingNodeId(null)
  }

  function updateNodeType(id: string, type: FlowchartNode['type']) {
    const current = dataRef.current
    save(updateFlowchartNode(current, id, { type }, getBodyBounds()))
    setMenuOpen(false)
  }

  function duplicateSelectedNode() {
    const current = dataRef.current
    const selected = current.nodes.find(node => node.id === selectedNodeId)
    if (!selected) return
    const id = uuid()
    save(addFlowchartNode(current, {
      type: selected.type,
      label: selected.label,
      x: selected.x + 24,
      y: selected.y + 24,
    }, () => id, getBodyBounds()))
    setSelectedNodeId(id)
    setEditingNodeId(id)
    setMenuOpen(false)
  }

  function deleteNode(id: string) {
    const current = dataRef.current
    save(deleteFlowchartNode(current, id))
    setSelectedNodeId(nodeId => nodeId === id ? null : nodeId)
    setConnectFrom(nodeId => nodeId === id ? null : nodeId)
    setConnectMode(false)
    setMenuOpen(false)
  }

  function toggleConnectMode() {
    setConnectMode(v => !v)
    setConnectFrom(connectMode ? null : selectedNodeId)
    setMenuOpen(false)
  }

  function handleNodeClick(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation()
    if (editingNodeId) return
    setSelectedNodeId(nodeId)
    if (!connectMode) return

    if (connectFrom === null) {
      setConnectFrom(nodeId)
    } else if (connectFrom !== nodeId) {
      const current = dataRef.current
      save(connectFlowchartNodes(current, connectFrom, nodeId))
      setConnectFrom(null)
      setConnectMode(false)
    } else {
      setConnectFrom(null)
    }
  }

  function startNodeDrag(e: React.MouseEvent, nodeId: string, nodeX: number, nodeY: number) {
    e.stopPropagation()
    e.preventDefault()
    if (editingNodeId === nodeId || connectMode) return
    setDraggingNode({ id: nodeId, ox: nodeX, oy: nodeY, startX: e.clientX, startY: e.clientY })
  }

  function handleBodyMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    if ((e.target as HTMLElement).closest('[data-fc-node],[data-fc-control]')) return
    setMenuOpen(false)
    setSelectedNodeId(null)
    if (!connectMode) setConnectFrom(null)
  }

  function editSelectedNode() {
    if (!selectedNodeId) return
    setEditingNodeId(selectedNodeId)
    setMenuOpen(false)
  }

  function onBodyMouseMove(e: React.MouseEvent) {
    if (!draggingNode) return
    const dx = (e.clientX - draggingNode.startX) / zoom
    const dy = (e.clientY - draggingNode.startY) / zoom
    setData(d => {
      const next = updateFlowchartNode(d, draggingNode.id, { x: draggingNode.ox + dx, y: draggingNode.oy + dy }, getBodyBounds())
      dataRef.current = next
      return next
    })
  }

  function onBodyMouseUp() {
    if (draggingNode) {
      save(dataRef.current)
      setDraggingNode(null)
    }
  }

  function getNodeCenter(node: FlowchartNode) {
    return { x: node.x + FLOWCHART_NODE_W / 2, y: node.y + FLOWCHART_NODE_H / 2 }
  }

  const HS = 8 / zoom
  const selectedNode = data.nodes.find(node => node.id === selectedNodeId) ?? null

  return (
    <div
      data-card
      style={{
        position: 'absolute', left: data.x, top: data.y, width: data.width, height: data.height,
        background: '#1a1a1a', border: `1.5px solid ${selected ? '#7c6af7' : '#2e2e2e'}`,
        borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div
        data-fc-control
        style={{ position: 'absolute', left: 8, top: 8, zIndex: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.86)', border: '1px solid #2e2e2e', borderRadius: 8, cursor: 'grab', userSelect: 'none', backdropFilter: 'blur(8px)' }}
        onMouseDown={onDragStart}
      >
        <GripVertical size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
      </div>
      <div
        data-fc-control
        style={{ position: 'absolute', right: 8, top: 8, zIndex: 20, display: 'flex', alignItems: 'center', gap: 4 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            title="Actions"
            onClick={() => setMenuOpen(v => !v)}
            style={{ width: 28, height: 28, background: connectMode ? '#1d4ed8' : '#2563eb', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: menuOpen || connectMode ? '0 0 0 2px rgba(37,99,235,0.28), 0 8px 18px rgba(37,99,235,0.24)' : '0 5px 14px rgba(37,99,235,0.18)' }}
          >
            <Plus size={14} />
          </button>
          {menuOpen && (
            <div
              style={{ position: 'absolute', right: 0, top: 32, zIndex: 2000, width: 210, background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 10, padding: 6, boxShadow: '0 16px 42px rgba(0,0,0,0.58)' }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              {([
                ['process', 'Step', <Plus size={12} key="step" />],
                ['decision', 'Decision', <span key="decision" style={{ fontSize: 13, color: '#f59e0b', lineHeight: 1 }}>◇</span>],
                ['end', 'End', <span key="end" style={{ fontSize: 10, color: '#ef4444', fontWeight: 800 }}>End</span>],
              ] as const).map(([type, label, icon]) => (
                <button key={type} onClick={() => addNode(type)}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 7, color: '#e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                  <span style={{ width: 16, display: 'flex', justifyContent: 'center', color: '#9ca3af' }}>{icon}</span>{label}
                </button>
              ))}

              <div style={{ height: 1, background: '#2e2e2e', margin: '5px 2px' }} />
              <button onClick={toggleConnectMode}
                style={{ width: '100%', background: connectMode ? 'rgba(37,99,235,0.16)' : 'transparent', border: 'none', borderRadius: 7, color: connectMode ? '#93c5fd' : '#e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><Link2 size={12} /></span>
                {connectMode ? 'Cancel connection' : 'Connect nodes'}
              </button>

              <div style={{ height: 1, background: '#2e2e2e', margin: '5px 2px' }} />
              <button disabled={!selectedNode} onClick={editSelectedNode}
                style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 7, color: selectedNode ? '#e5e7eb' : '#4b5563', cursor: selectedNode ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><Pencil size={12} /></span>Rename node
              </button>
              <button disabled={!selectedNode} onClick={duplicateSelectedNode}
                style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 7, color: selectedNode ? '#e5e7eb' : '#4b5563', cursor: selectedNode ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><Copy size={12} /></span>Duplicate node
              </button>
              {selectedNode && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: '4px 6px' }}>
                  {(['process', 'decision', 'end'] as const).map(type => (
                    <button key={type} onClick={() => updateNodeType(selectedNode.id, type)}
                      style={{ background: selectedNode.type === type ? 'rgba(124,106,247,0.22)' : '#242424', border: `1px solid ${selectedNode.type === type ? '#7c6af7' : '#2e2e2e'}`, borderRadius: 6, color: selectedNode.type === type ? '#ddd6fe' : '#9ca3af', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '5px 3px' }}>
                      {type === 'process' ? 'Step' : type === 'decision' ? 'Decide' : 'End'}
                    </button>
                  ))}
                </div>
              )}
              <button disabled={!selectedNode} onClick={() => selectedNode && deleteNode(selectedNode.id)}
                style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 7, color: selectedNode ? '#f87171' : '#4b5563', cursor: selectedNode ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><Trash2 size={12} /></span>Delete node
              </button>
            </div>
          )}
        </div>
        <button
          data-fc-control
          onMouseDown={e => e.stopPropagation()}
          onClick={onDelete}
          style={{ width: 28, height: 28, background: 'rgba(26,26,26,0.86)', border: '1px solid #2e2e2e', borderRadius: 8, cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{ flex: 1, position: 'relative', background: '#0f0f0f', overflow: 'hidden', cursor: connectMode ? 'crosshair' : 'default' }}
        onMouseDown={handleBodyMouseDown}
        onWheel={e => e.stopPropagation()}
        onDoubleClick={addNodeFromDoubleClick}
        onMouseMove={onBodyMouseMove}
        onMouseUp={onBodyMouseUp}
        onMouseLeave={onBodyMouseUp}
      >
        {/* Edges SVG */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b3b3b" />
            </marker>
          </defs>
          {data.edges.map((edge, i) => {
            const from = data.nodes.find(n => n.id === edge.from)
            const to = data.nodes.find(n => n.id === edge.to)
            if (!from || !to) return null
            const fc = getNodeCenter(from), tc = getNodeCenter(to)
            return (
              <path
                key={i}
                d={`M${fc.x},${fc.y} Q${(fc.x + tc.x) / 2},${fc.y} ${tc.x},${tc.y}`}
                stroke="#3b3b3b" strokeWidth={1.5} fill="none"
                markerEnd="url(#arrowhead)"
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {data.nodes.map(node => {
          const color = NODE_COLORS[node.type]
          const isConnecting = connectFrom === node.id
          const isSelected = selectedNodeId === node.id
          const isRound = node.type === 'start' || node.type === 'end'
          const borderColor = isConnecting || isSelected ? '#93c5fd' : `${color}b8`
          return (
            <div
              key={node.id}
              data-fc-node
              style={{
                position: 'absolute', left: node.x, top: node.y, width: FLOWCHART_NODE_W, height: FLOWCHART_NODE_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: connectMode ? 'crosshair' : 'grab', userSelect: 'none',
              }}
              onClick={e => handleNodeClick(e, node.id)}
              onDoubleClick={e => { e.stopPropagation(); setEditingNodeId(node.id) }}
              onMouseDown={e => startNodeDrag(e, node.id, node.x, node.y)}
            >
              <div style={{
                width: '100%', height: '100%', background: NODE_BACKGROUNDS[node.type],
                border: `1.5px solid ${borderColor}`,
                borderRadius: isRound ? FLOWCHART_NODE_H / 2 : 10,
                clipPath: node.type === 'decision' ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isConnecting || isSelected
                  ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 3px rgba(37,99,235,0.22), 0 12px 26px rgba(0,0,0,0.32)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 9px 22px rgba(0,0,0,0.24)',
                padding: node.type === 'decision' ? '0 22px' : '0 12px',
                boxSizing: 'border-box',
              }}>
                {editingNodeId === node.id ? (
                  <input
                    autoFocus
                    defaultValue={node.label}
                    onBlur={e => updateNodeLabel(node.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: 700, color: '#f9fafb', width: '100%', textAlign: 'center', minWidth: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{node.label}</span>
                )}
              </div>
              <button
                data-fc-control
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); deleteNode(node.id) }}
                style={{ position: 'absolute', top: -8, right: -8, background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '50%', cursor: 'pointer', color: '#6b7280', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSelected ? 1 : 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = isSelected ? '1' : '0' }}
              >
                <X size={9} />
              </button>
            </div>
          )
        })}

        {/* Empty hint */}
        {data.nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: 12, pointerEvents: 'none', flexDirection: 'column', gap: 8 }}>
            <Plus size={20} style={{ opacity: 0.4 }} />
            <button
              data-fc-control
              onMouseDown={e => e.stopPropagation()}
              onClick={() => addNode('process')}
              style={{ pointerEvents: 'auto', background: '#242424', border: '1px solid #2e2e2e', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={12} /> Node
            </button>
          </div>
        )}
      </div>

      {/* Resize handles */}
      {CORNER_HANDLES.map(h => (
        <div
          key={h.id}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
          style={{
            position: 'absolute', width: HS, height: HS,
            background: selected ? '#7c6af7' : '#3b3b3b',
            border: `${1 / zoom}px solid rgba(255,255,255,0.3)`,
            borderRadius: 2 / zoom,
            ...h.style,
          }}
        />
      ))}
    </div>
  )
}
