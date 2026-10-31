'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

export type BusinessNodeId =
  | 'Pricing'
  | 'Marketing'
  | 'Costs'
  | 'Customers'
  | 'Revenue'
  | 'Cash'

type InspectorData = {
  id: BusinessNodeId
  value: string
  descriptor: string
  delta: string
  effects: string[]
  chart: string
}

export const inspectorData: Record<BusinessNodeId, InspectorData> = {
  Pricing: {
    id: 'Pricing',
    value: '$99',
    descriptor: 'ARPA / mo',
    delta: '+2%',
    effects: ['Conversion −7%', 'Revenue +8.2%', 'Cash 12 mo +$420k'],
    chart: 'M2 42 C18 36 23 43 38 29 S57 33 70 21 S91 26 106 12 S129 15 148 5',
  },
  Marketing: {
    id: 'Marketing',
    value: '$184',
    descriptor: 'paid CAC',
    delta: '−30% spend',
    effects: ['Customers +3.4%', 'Revenue +5.1%', 'Cash +$280k'],
    chart: 'M2 34 C14 28 24 33 34 21 S54 29 66 17 S86 20 100 13 S126 19 148 4',
  },
  Costs: {
    id: 'Costs',
    value: '36%',
    descriptor: 'COGS',
    delta: '−1.2pp',
    effects: ['Gross margin +1.2pp', 'Operating costs −4%', 'Cash +$96k'],
    chart: 'M2 12 C18 18 23 14 39 22 S61 17 74 28 S98 20 111 24 S132 14 148 10',
  },
  Customers: {
    id: 'Customers',
    value: '4,820',
    descriptor: 'active',
    delta: '+3.4%',
    effects: ['Conversion +3.4%', 'Churn +0.4pp', 'Revenue +8.2%'],
    chart: 'M2 39 C13 33 22 37 34 29 S50 32 64 18 S82 22 94 14 S123 19 148 4',
  },
  Revenue: {
    id: 'Revenue',
    value: '$8.4M',
    descriptor: 'ARR',
    delta: '+8.2%',
    effects: ['Pricing +8%', 'Customers +3.4%', 'Cash +$420k'],
    chart: 'M2 41 C16 38 21 29 34 32 S50 23 63 26 S81 15 96 18 S121 10 148 4',
  },
  Cash: {
    id: 'Cash',
    value: '$1.9M',
    descriptor: '14 mo runway',
    delta: '+$420k',
    effects: ['Pricing $99', 'Marketing $184', 'Costs 36%'],
    chart: 'M2 35 C15 30 20 37 34 25 S54 27 66 21 S82 27 96 15 S126 17 148 6',
  },
}

type InspectorProps = {
  activeNode: BusinessNodeId
  reducedMotion: boolean
}

export default function Inspector({
  activeNode,
  reducedMotion,
}: InspectorProps) {
  const data = inspectorData[activeNode]
  const panelRef = useRef<HTMLDivElement>(null)
  const previousNode = useRef(activeNode)

  useEffect(() => {
    if (!reducedMotion && previousNode.current !== activeNode) {
      panelRef.current?.animate(
        [
          { opacity: 0.55, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 150, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      )
    }
    previousNode.current = activeNode
  }, [activeNode, reducedMotion])

  return (
    <aside
      aria-label={`${activeNode} inspector`}
      className="twin-inspector rounded-2xl border border-white/[0.09] bg-[#101412]/80 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
          Live inspector
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#86EFAC]">
          <span className="size-1.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,.8)]" />
          Live
        </span>
      </div>

      <div ref={panelRef} className="mt-7">
          <p className="text-xs text-white/40">Selected node</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="text-2xl font-medium tracking-[-0.06em] text-white">
              {data.id}
            </h3>
            <span className="rounded-full border border-[#22C55E]/20 bg-[#22C55E]/[0.08] px-2.5 py-1 text-[10px] font-medium text-[#86EFAC]">
              {data.delta}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <InspectorTicker
                value={data.value}
                reducedMotion={reducedMotion}
                className="twin-inspector-value text-[34px] font-medium leading-none tabular-nums tracking-[-0.07em] text-white"
              />
              <p className="mt-2 text-[11px] text-white/45">{data.descriptor}</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/30">
              90 days
            </span>
          </div>

          <svg
            viewBox="0 0 150 52"
            role="img"
            aria-label={`${data.id} trend chart`}
            className="twin-inspector-chart mt-5 h-[76px] w-full overflow-visible"
          >
            <defs>
              <linearGradient id="twin-inspector-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity=".25" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${data.chart} L148 52 L2 52 Z`}
              fill="url(#twin-inspector-area)"
              className="twin-inspector-area"
            />
            <path
              d={data.chart}
              pathLength={1}
              fill="none"
              stroke="#22C55E"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="twin-inspector-line"
            />
          </svg>

          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
              Ripple effects
            </p>
            <ul className="mt-3 space-y-2">
              {data.effects.map((effect, index) => (
                <motion.li
                  key={`${data.id}-${effect}`}
                  initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.22,
                    delay: reducedMotion ? 0 : index * 0.055,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="flex items-center gap-2 text-xs text-white/65"
                >
                  <span className="size-1 rounded-full bg-[#22C55E]" />
                  {effect}
                </motion.li>
              ))}
            </ul>
          </div>
      </div>
    </aside>
  )
}

function InspectorTicker({
  value,
  reducedMotion,
  className,
}: {
  value: string
  reducedMotion: boolean
  className: string
}) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const initialValue = useRef(value)

  useEffect(() => {
    const element = elementRef.current
    if (!element || initialValue.current === value) return

    element.textContent = value
    if (!reducedMotion) {
      element.animate(
        [
          { opacity: 0.25, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      )
    }
  }, [reducedMotion, value])

  return (
    <span ref={elementRef} className={className} aria-live="polite">
      {initialValue.current}
    </span>
  )
}
