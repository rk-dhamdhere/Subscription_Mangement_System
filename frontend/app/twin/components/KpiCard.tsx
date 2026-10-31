'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

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

function KpiCard({
  label,
  value,
  index,
  runId,
}: KpiCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [inView, setInView] = useState(false)
  const valueRef = useRef<HTMLSpanElement>(null)
  const line = lineVariants[(index + runId) % lineVariants.length]
  const duration = 5 + (index % 3)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(preference.matches)
    setMounted(true)

    const updatePreference = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    const element = cardRef.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = valueRef.current
    if (!element || runId === 0 || !mounted || reducedMotion) return
    element.animate(
      [
        { opacity: 0.25, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    )
  }, [mounted, reducedMotion, runId, value])

  return (
    <motion.div
      ref={cardRef}
      className="flex flex-col items-center"
      animate={
        mounted && inView && !reducedMotion
          ? { y: [0, -4, 0, 4, 0] }
          : undefined
      }
      transition={
        !mounted || !inView || reducedMotion
          ? undefined
          : {
              duration,
              delay: index * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
    >
      <div className="w-full rounded-xl border border-white/[0.11] bg-[#101412]/90 px-3 py-3 shadow-[0_12px_38px_rgba(0,0,0,0.28)] backdrop-blur-md sm:min-w-[155px] sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium tracking-[0.08em] text-white/50 sm:text-[11px]">
            {label}
          </span>
          <span className="size-1.5 rounded-full bg-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.85)]" />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <span
            ref={valueRef}
            aria-live="polite"
            className="text-lg font-medium tabular-nums tracking-[-0.045em] text-white sm:text-xl"
          >
            {value}
          </span>
          <svg
            key={`spark-${runId}-${index}`}
            viewBox="0 0 120 36"
            fill="none"
            aria-hidden="true"
            className="mb-0.5 h-7 w-[58px] overflow-visible sm:w-[68px]"
          >
            <path
              d={line}
              pathLength="100"
              stroke="#22C55E"
              strokeWidth="1.7"
              strokeLinecap="round"
                className={mounted && !reducedMotion ? 'twin-sparkline' : ''}
            />
            <circle
              cx="117"
              cy={line.includes('118 3') ? '3' : line.includes('118 2') ? '2' : '5'}
              r="2.2"
              fill="#86EFAC"
              className={mounted && !reducedMotion ? 'twin-spark-end' : ''}
            />
          </svg>
        </div>
      </div>
      <span className="h-10 w-px bg-gradient-to-b from-white/20 to-[#22C55E]/75 sm:h-16" />
      <span className="size-1.5 rounded-full bg-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.95)]" />
    </motion.div>
  )
}

export default memo(KpiCard)
