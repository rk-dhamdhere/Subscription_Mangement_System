'use client'

import {
  animate,
  motion,
  useMotionValue,
  type PanInfo,
} from 'framer-motion'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Inspector, {
  inspectorData,
  type BusinessNodeId,
} from './Inspector'

type Point = { x: number; y: number }
type NodeDefinition = Point & {
  id: BusinessNodeId
  descriptor: string
}
type NodePositions = Record<BusinessNodeId, Point>

const initialNodes: NodeDefinition[] = [
  { id: 'Pricing', x: 215, y: 142, descriptor: '$99 ARPA / mo' },
  { id: 'Marketing', x: 785, y: 142, descriptor: '$184 paid CAC' },
  { id: 'Costs', x: 185, y: 365, descriptor: '36% COGS' },
  { id: 'Customers', x: 815, y: 365, descriptor: '4,820 active' },
  { id: 'Revenue', x: 350, y: 535, descriptor: '$8.4M ARR' },
  { id: 'Cash', x: 650, y: 535, descriptor: '$1.9M · 14 mo' },
]

const initialPositions = Object.fromEntries(
  initialNodes.map(({ id, x, y }) => [id, { x, y }]),
) as NodePositions

const dependencyChains: Record<BusinessNodeId, BusinessNodeId[]> = {
  Pricing: ['Pricing', 'Customers', 'Revenue', 'Cash'],
  Marketing: ['Marketing', 'Customers', 'Revenue', 'Cash'],
  Costs: ['Costs', 'Revenue', 'Cash'],
  Customers: ['Customers', 'Revenue', 'Cash'],
  Revenue: ['Revenue', 'Pricing', 'Customers', 'Costs', 'Cash'],
  Cash: ['Cash', 'Pricing', 'Marketing', 'Costs', 'Customers', 'Revenue'],
}

const GRAPH_WIDTH = 1000
const GRAPH_HEIGHT = 620
const HUB = { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }
const DRAG_RADIUS = 370

function clampNodePosition(point: Point): Point {
  const dx = point.x - HUB.x
  const dy = point.y - HUB.y
  const distance = Math.hypot(dx, dy)
  const boundedDistance = Math.min(distance, DRAG_RADIUS)
  const scale = distance > 0 ? boundedDistance / distance : 1
  return {
    x: Math.min(930, Math.max(70, HUB.x + dx * scale)),
    y: Math.min(565, Math.max(55, HUB.y + dy * scale)),
  }
}

function rubberBandPosition(point: Point): Point {
  const dx = point.x - HUB.x
  const dy = point.y - HUB.y
  const distance = Math.hypot(dx, dy)
  if (distance <= DRAG_RADIUS) return point
  const rubberDistance = DRAG_RADIUS + (distance - DRAG_RADIUS) * 0.22
  const scale = rubberDistance / distance
  return {
    x: Math.min(955, Math.max(45, HUB.x + dx * scale)),
    y: Math.min(590, Math.max(30, HUB.y + dy * scale)),
  }
}

function connectionPath(point: Point) {
  const dx = point.x - HUB.x
  const dy = point.y - HUB.y
  const firstControl = {
    x: HUB.x + dx * 0.38 + dy * 0.1,
    y: HUB.y + dy * 0.12,
  }
  const secondControl = {
    x: point.x - dx * 0.12,
    y: point.y - dy * 0.36,
  }
  return `M ${HUB.x} ${HUB.y} C ${firstControl.x} ${firstControl.y}, ${secondControl.x} ${secondControl.y}, ${point.x} ${point.y}`
}

type GraphNodeProps = {
  node: NodeDefinition
  position: Point
  graphRef: React.RefObject<HTMLDivElement | null>
  draggable: boolean
  active: boolean
  selected: boolean
  dimmed: boolean
  onSelect: (id: BusinessNodeId) => void
  onHover: (id: BusinessNodeId | null) => void
  onDragStart: (id: BusinessNodeId) => void
  onDrag: (id: BusinessNodeId, position: Point) => void
  onDragCommit: (id: BusinessNodeId, position: Point) => void
}

function GraphNode({
  node,
  position,
  graphRef,
  draggable,
  active,
  selected,
  dimmed,
  onSelect,
  onHover,
  onDragStart,
  onDrag,
  onDragCommit,
}: GraphNodeProps) {
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const dragOrigin = useRef(position)
  const [isDragging, setIsDragging] = useState(false)

  const updateDragPosition = useCallback(
    (info: PanInfo) => {
      const bounds = graphRef.current?.getBoundingClientRect()
      if (!bounds) return

      const rawPosition = {
        x: dragOrigin.current.x + (info.offset.x / bounds.width) * GRAPH_WIDTH,
        y:
          dragOrigin.current.y +
          (info.offset.y / bounds.height) * GRAPH_HEIGHT,
      }
      const rubberPosition = rubberBandPosition(rawPosition)
      dragX.set(((rubberPosition.x - dragOrigin.current.x) / GRAPH_WIDTH) * bounds.width)
      dragY.set(((rubberPosition.y - dragOrigin.current.y) / GRAPH_HEIGHT) * bounds.height)
      onDrag(node.id, rubberPosition)
    },
    [dragX, dragY, graphRef, node.id, onDrag],
  )

  const finishDrag = useCallback(
    async (info: PanInfo) => {
      const bounds = graphRef.current?.getBoundingClientRect()
      if (!bounds) return
      const current = {
        x: dragOrigin.current.x + (info.offset.x / bounds.width) * GRAPH_WIDTH,
        y: dragOrigin.current.y + (info.offset.y / bounds.height) * GRAPH_HEIGHT,
      }
      const bounded = clampNodePosition(current)
      const momentumTarget = clampNodePosition({
        x: bounded.x + (info.velocity.x / bounds.width) * GRAPH_WIDTH * 0.12,
        y: bounded.y + (info.velocity.y / bounds.height) * GRAPH_HEIGHT * 0.12,
      })
      const targetX =
        ((momentumTarget.x - dragOrigin.current.x) / GRAPH_WIDTH) * bounds.width
      const targetY =
        ((momentumTarget.y - dragOrigin.current.y) / GRAPH_HEIGHT) * bounds.height
      await Promise.all([
        animate(dragX, targetX, {
          type: 'spring',
          stiffness: 120,
          damping: 18,
          onUpdate: (value) => {
            const x = dragOrigin.current.x + (value / bounds.width) * GRAPH_WIDTH
            const y = dragOrigin.current.y + (dragY.get() / bounds.height) * GRAPH_HEIGHT
            onDrag(node.id, { x, y })
          },
        }).then(() => undefined),
        animate(dragY, targetY, {
          type: 'spring',
          stiffness: 120,
          damping: 18,
          onUpdate: (value) => {
            const x = dragOrigin.current.x + (dragX.get() / bounds.width) * GRAPH_WIDTH
            const y = dragOrigin.current.y + (value / bounds.height) * GRAPH_HEIGHT
            onDrag(node.id, { x, y })
          },
        }).then(() => undefined),
      ])

      dragOrigin.current = momentumTarget
      onDragCommit(node.id, momentumTarget)
      dragX.set(0)
      dragY.set(0)
      setIsDragging(false)
    },
    [dragX, dragY, graphRef, node.id, onDrag, onDragCommit],
  )

  useEffect(() => {
    if (!draggable) {
      dragX.set(0)
      dragY.set(0)
    }
  }, [dragX, dragY, draggable])

  return (
    <motion.button
      type="button"
      aria-label={`${node.id}, ${inspectorData[node.id].value} ${node.descriptor}`}
      aria-pressed={selected}
      drag={draggable}
      dragConstraints={graphRef}
      dragElastic={0.18}
      dragMomentum
      dragTransition={{ bounceStiffness: 120, bounceDamping: 14, power: 0.18 }}
      onDragStart={() => {
        dragOrigin.current = position
        setIsDragging(true)
        onDragStart(node.id)
      }}
      onDrag={(_event, info) => updateDragPosition(info)}
      onDragEnd={(_event, info) => void finishDrag(info)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onSelect(node.id)}
      onClick={() => onSelect(node.id)}
      style={{
        left: `${(position.x / GRAPH_WIDTH) * 100}%`,
        top: `${(position.y / GRAPH_HEIGHT) * 100}%`,
        x: dragX,
        y: dragY,
        willChange: isDragging ? 'transform' : 'auto',
      }}
      className={[
        'twin-graph-node absolute z-10 flex min-w-[116px] -translate-x-1/2 -translate-y-1/2 flex-col items-start rounded-xl border px-3 py-2 text-left transition-opacity duration-200',
        active
          ? 'border-[#22C55E]/60 bg-[#10321f] shadow-[0_0_30px_rgba(34,197,94,.18)]'
          : 'border-white/[0.12] bg-[#171b1b]/95 hover:border-[#22C55E]/35',
        dimmed ? 'opacity-25' : 'opacity-100',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-xs font-medium text-white">{node.id}</span>
        <span className="size-1.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,.7)]" />
      </span>
      <span className="mt-1 text-[10px] tabular-nums text-white/45">
        {node.descriptor}
      </span>
    </motion.button>
  )
}

const MemoizedGraphNode = memo(GraphNode)

function NodeGraph() {
  const graphRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<NodePositions>(initialPositions)
  const [livePositions, setLivePositions] =
    useState<NodePositions>(initialPositions)
  const [selectedNode, setSelectedNode] = useState<BusinessNodeId>('Cash')
  const [hoveredNode, setHoveredNode] = useState<BusinessNodeId | null>(null)
  const [drawn, setDrawn] = useState(false)
  const [graphVisible, setGraphVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobile, setMobile] = useState(false)
  const activeNode = hoveredNode ?? selectedNode
  const activeChain = useMemo(
    () => new Set(dependencyChains[activeNode]),
    [activeNode],
  )

  useEffect(() => {
    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const mobilePreference = window.matchMedia('(max-width: 767px)')
    setReducedMotion(motionPreference.matches)
    setMobile(mobilePreference.matches)
    setMounted(true)

    const updateMotion = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches)
    const updateMobile = (event: MediaQueryListEvent) =>
      setMobile(event.matches)
    motionPreference.addEventListener('change', updateMotion)
    mobilePreference.addEventListener('change', updateMobile)

    return () => {
      motionPreference.removeEventListener('change', updateMotion)
      mobilePreference.removeEventListener('change', updateMobile)
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setGraphVisible(entry.isIntersecting)
        if (entry.isIntersecting) setDrawn(true)
      },
      { threshold: 0.18 },
    )
    observer.observe(graph)
    return () => observer.disconnect()
  }, [])

  const selectNode = useCallback((id: BusinessNodeId) => {
    setSelectedNode(id)
    setHoveredNode(null)
  }, [])

  const startDrag = useCallback((id: BusinessNodeId) => {
    setSelectedNode(id)
    setHoveredNode(id)
  }, [])

  const updateLivePosition = useCallback(
    (id: BusinessNodeId, position: Point) => {
      setLivePositions((current) => ({ ...current, [id]: position }))
    },
    [],
  )

  const commitPosition = useCallback(
    (id: BusinessNodeId, position: Point) => {
      const finalPosition = clampNodePosition(position)
      setPositions((current) => ({ ...current, [id]: finalPosition }))
      setLivePositions((current) => ({ ...current, [id]: finalPosition }))
    },
    [],
  )

  return (
    <section
      aria-labelledby="twin-graph-heading"
      className="twin-node-section relative overflow-hidden px-5 py-20 text-white sm:px-8 sm:py-28"
    >
      <div className="relative z-10 mx-auto max-w-[1320px]">
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.2em] text-[#86EFAC]">
              The Twin
            </p>
            <h2
              id="twin-graph-heading"
              className="max-w-[680px] text-[clamp(2rem,4.5vw,3.8rem)] font-medium leading-[1.02] tracking-[-0.07em]"
            >
              Your entire business. One connected model.
            </h2>
          </div>
          <p className="max-w-[330px] text-sm leading-6 text-white/50">
            Revenue, customers, costs and cash in one living model.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
          <Inspector activeNode={activeNode} />

          <div className="min-w-0">
            <div
              ref={graphRef}
              className="twin-node-graph relative aspect-[1.35/1] w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101413]/70 sm:aspect-[1.55/1]"
            >
              <svg
                viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0 size-full overflow-visible"
              >
                <defs>
                  <radialGradient id="twin-hub-glow">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx={HUB.x} cy={HUB.y} r="150" fill="url(#twin-hub-glow)" />
                {initialNodes.map((node, index) => {
                  const position = livePositions[node.id]
                  const highlighted = activeChain.has(node.id)
                  const path = connectionPath(position)
                  return (
                    <g
                      key={node.id}
                      className={
                        activeNode && !highlighted
                          ? 'twin-graph-edge is-dimmed'
                          : 'twin-graph-edge'
                      }
                    >
                      <path
                        id={`twin-edge-${node.id.toLowerCase()}`}
                        d={path}
                        pathLength="1"
                        fill="none"
                        stroke={highlighted ? '#22C55E' : 'rgba(255,255,255,.16)'}
                        strokeWidth={highlighted ? '1.8' : '1.2'}
                        className={[
                          'twin-connection-path',
                          drawn ? 'is-drawn' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          transitionDelay: `${index * 0.1}s`,
                        }}
                      />
                      {mounted && graphVisible && !reducedMotion && (
                        <circle
                          r={highlighted ? '3.2' : '2.4'}
                          fill={highlighted ? '#86EFAC' : '#22C55E'}
                          className="twin-travel-dot"
                        >
                          <animateMotion
                            dur={`${3.2 + index * 0.55}s`}
                            calcMode="linear"
                            repeatCount="indefinite"
                            rotate="auto"
                          >
                            <mpath href={`#twin-edge-${node.id.toLowerCase()}`} />
                          </animateMotion>
                        </circle>
                      )}
                    </g>
                  )
                })}
              </svg>

              <div className="twin-graph-hub absolute left-1/2 top-1/2 z-10 grid size-[74px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[22px] border border-[#86EFAC]/30 bg-[#0b1710]/95 shadow-[0_0_45px_rgba(34,197,94,.2)]">
                <svg
                  viewBox="0 0 40 40"
                  aria-hidden="true"
                  className="size-9 text-[#86EFAC]"
                  fill="none"
                >
                  <circle cx="16" cy="20" r="9" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="24" cy="20" r="9" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </div>

              {initialNodes.map((node) => {
                const position = positions[node.id]
                const active = activeChain.has(node.id)
                return (
                  <MemoizedGraphNode
                    key={node.id}
                    node={node}
                    position={position}
                    graphRef={graphRef}
                    draggable={mounted && !mobile}
                    active={active}
                    selected={node.id === selectedNode}
                    dimmed={Boolean(activeNode) && !active}
                    onSelect={selectNode}
                    onHover={setHoveredNode}
                    onDragStart={startDrag}
                    onDrag={updateLivePosition}
                    onDragCommit={commitPosition}
                  />
                )
              })}

              <p className="absolute bottom-3 left-4 z-20 text-[10px] tracking-[0.02em] text-white/40 sm:bottom-4 sm:left-5">
                {mobile ? 'Tap any node · select to inspect' : 'Drag any node · hover to trace'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(NodeGraph)
