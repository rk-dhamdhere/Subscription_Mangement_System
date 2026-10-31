'use client'

import { memo, useEffect, useRef, type CSSProperties } from 'react'

type KpiCardProps = {
  label: string
  value: string
  index: number
  runId: number
}

const lineVariants = [
  'M2 28 C14 24 16 26 26 19 S42 22 52 15 S69 18 79 9 S96 12 118 3',
  'M2 31 C13 26 18 29 28 20 S43 23 54 16 S72 17 81 11 S101 9 118 2',
  'M2 22 C16 27 16 20 29 23 S43 17 53 20 S68 12 79 15 S100 7 118 5',
]

const valueRuns = [
  ['−6.8%', '+8.4%', '+0.3pp', '+$436k'],
  ['−7.2%', '+8.1%', '+0.5pp', '+$408k'],
  ['−7%', '+8.2%', '+0.4pp', '+$420k'],
]

function KpiCard({ label, value, index, runId }: KpiCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const line = lineVariants[(index + runId) % lineVariants.length]
  const endY = line.includes('118 3') ? '3' : line.includes('118 2') ? '2' : '5'

  useEffect(() => {
    const element = valueRef.current
    if (!element || runId === 0) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const nextValue = valueRuns[(runId - 1) % valueRuns.length][index]
    element.textContent = nextValue
    if (!reducedMotion) {
      element.animate(
        [
          { opacity: 0.25, transform: 'translateY(5px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      )
    }
  }, [index, runId])

  return (
    <div
      className="twin-kpi-float flex min-w-0 flex-col items-center"
      style={
        {
          '--twin-kpi-duration': `${5 + (index % 3)}s`,
          '--twin-kpi-delay': `${index * -0.75}s`,
        } as CSSProperties
      }
    >
      <div className="w-full rounded-xl border border-white/[0.11] bg-[#101412]/90 px-2 py-2.5 shadow-[0_12px_38px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[9px] font-medium tracking-[0.04em] text-white/50 sm:text-[11px] sm:tracking-[0.08em]">
            {label}
          </span>
          <span className="size-1.5 shrink-0 rounded-full bg-[#22C55E]" />
        </div>
        <div className="mt-1 flex min-w-0 items-end justify-between gap-1">
          <span
            ref={valueRef}
            aria-live="polite"
            className="whitespace-nowrap text-sm font-medium tabular-nums tracking-[-0.045em] text-white sm:text-xl"
          >
            {value}
          </span>
          <svg
            key={`spark-${runId}-${index}`}
            viewBox="0 0 120 36"
            fill="none"
            aria-hidden="true"
            className="twin-kpi-spark mb-0.5 hidden h-7 w-[58px] shrink-0 overflow-visible sm:block sm:w-[68px]"
          >
            <path
              d={line}
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset="100"
              stroke="#22C55E"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="twin-sparkline"
            />
            <circle
              cx="117"
              cy={endY}
              r="4.5"
              fill="#22C55E"
              opacity=".18"
              aria-hidden="true"
            />
            <circle
              cx="117"
              cy={endY}
              r="2.2"
              fill="#86EFAC"
              className="twin-spark-end"
            />
          </svg>
        </div>
      </div>
      <span className="h-7 w-px bg-gradient-to-b from-white/20 to-[#22C55E]/75 sm:h-16" />
      <span className="size-1.5 rounded-full bg-[#22C55E]" />
    </div>
  )
}

export default memo(KpiCard)
