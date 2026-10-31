'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import './twin.css'
import DotFloor from './components/DotFloor'
import NodeGraph from './components/NodeGraph'
import KpiCard from './components/KpiCard'
import ScrollStatement from './components/ScrollStatement'

const metricRuns = [
  [
    { label: 'Conversion', value: '−7%' },
    { label: 'Revenue', value: '+8.2%' },
    { label: 'Churn', value: '+0.4pp' },
    { label: 'Cash', value: '+$420k' },
  ],
  [
    { label: 'Conversion', value: '−6.8%' },
    { label: 'Revenue', value: '+8.4%' },
    { label: 'Churn', value: '+0.3pp' },
    { label: 'Cash', value: '+$436k' },
  ],
  [
    { label: 'Conversion', value: '−7.2%' },
    { label: 'Revenue', value: '+8.1%' },
    { label: 'Churn', value: '+0.5pp' },
    { label: 'Cash', value: '+$408k' },
  ],
]

const headline = 'Simulate the decision before you make it.'
const presets = [
  { label: 'Price +8%', input: 'What if we raise prices by 8%?' },
  { label: 'Paid ads -30%', input: 'What if we cut paid ads by 30%?' },
  { label: 'Hire 10 people', input: 'What if we hire 10 people?' },
]

const headlineVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.13, delayChildren: 0.15 },
  },
}

const wordVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  },
}

function TwinHero() {
  const [runId, setRunId] = useState(0)
  const [input, setInput] = useState('What if we raise prices by 15%?')
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const metrics = metricRuns[runId % metricRuns.length]

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

  function runSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRunId((current) => current + 1)
  }

  function runPreset(prompt: string) {
    setInput(prompt)
    setRunId((current) => current + 1)
  }

  return (
    <main
      className="relative isolate bg-[#0A0B0D] text-white"
      style={{
        fontFamily: 'Inter, Geist, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <section
        id="product"
        aria-label="Twin decision simulator"
        className="relative isolate min-h-[100svh] overflow-hidden bg-[#0A0B0D]"
      >
        <DotFloor pulseKey={runId} />

        <div
          className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col px-5 pt-5 sm:px-8 lg:px-12"
        >
        <header className="flex min-h-10 items-center justify-between gap-6">
          <a
            href="/"
            className="pointer-events-auto inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.04em] text-white/90 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86EFAC]"
          >
            <span className="grid size-7 place-items-center rounded-lg border border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]">
              <Sparkles aria-hidden="true" className="size-3.5" />
            </span>
            Twin
          </a>
          <nav
            aria-label="Twin navigation"
            className="pointer-events-auto hidden items-center gap-5 lg:flex"
          >
            {[
              ['Product', '#product'],
              ['Simulate', '#simulate'],
              ['Compare', '/#compare'],
              ['Intelligence', '/#intelligence'],
              ['Memory', '/#memory'],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[11px] text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86EFAC]"
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href="/"
            className="pointer-events-auto text-xs text-white/50 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#86EFAC]"
          >
            Back to home
          </a>
        </header>

        <div className="pointer-events-auto relative z-20 mx-auto mt-7 w-full max-w-[650px] sm:mt-8">
          <div className="mb-2.5 flex flex-wrap justify-center gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => runPreset(preset.input)}
                className="rounded-full border border-white/[0.1] bg-[#101412]/75 px-3 py-1.5 text-[10px] font-medium text-white/55 transition-colors hover:border-[#22C55E]/35 hover:text-[#86EFAC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86EFAC] sm:text-[11px]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <form
            id="simulate"
            onSubmit={runSimulation}
            className="flex w-full items-center gap-2 rounded-full border border-white/[0.12] bg-[#101412]/90 p-1.5 shadow-[0_12px_60px_rgba(0,0,0,0.28)] backdrop-blur-md"
          >
            <label htmlFor="decision-prompt" className="sr-only">
              Describe a business decision to simulate
            </label>
            <input
              id="decision-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#22C55E] px-4 text-xs font-semibold text-[#07120d] transition-colors hover:bg-[#86EFAC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86EFAC] active:scale-[0.97] sm:px-5"
            >
              Simulate <ArrowRight aria-hidden="true" className="size-3.5" />
            </button>
          </form>
        </div>

        <section
          aria-label="Business simulation preview"
          className="mt-7 flex w-full flex-1 flex-col"
        >
          <div className="pointer-events-none relative z-10 mx-auto grid w-full max-w-[1060px] grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:w-[84%]">
            {metrics.map((metric, index) => (
              <KpiCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                index={index}
                runId={runId}
              />
            ))}
          </div>

          <div className="mt-auto pb-10 pt-12 sm:pb-12">
            <motion.h1
              variants={headlineVariants}
              initial={mounted && !reducedMotion ? 'hidden' : false}
              animate={mounted && !reducedMotion ? 'visible' : false}
              className="max-w-[16ch] text-[clamp(2.25rem,4.5vw,4rem)] font-medium leading-[1.02] tracking-[-0.075em] text-white"
            >
              {headline.split(' ').map((word, index) => (
                <motion.span
                  key={`${word}-${index}`}
                  variants={wordVariants}
                  className="mr-[0.2em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <motion.a
                href="#simulate"
                whileHover={
                  mounted && !reducedMotion ? { scale: 1.015 } : undefined
                }
                whileTap={mounted && !reducedMotion ? { scale: 0.97 } : undefined}
                className="pointer-events-auto group inline-flex items-center gap-3 rounded-full border border-[#86EFAC]/15 bg-[#22C55E] py-1.5 pl-5 pr-1.5 text-sm font-semibold text-[#07120d] shadow-[0_0_38px_rgba(34,197,94,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#86EFAC]"
              >
                Build your Business Twin
                <span className="grid size-8 place-items-center rounded-full bg-[#0A0B0D] text-[#86EFAC]">
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </motion.a>
              <a
                href="#twin-statement"
                className="pointer-events-auto inline-flex items-center rounded-full border border-white/[0.12] bg-[#101412]/75 px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#86EFAC]"
              >
                See how it works
              </a>
            </div>
            <p className="mt-7 max-w-[270px] text-xs leading-5 text-white/45 sm:ml-auto sm:text-right">
              See how every decision ripples through your business — before it
              touches reality.
            </p>
          </div>
        </section>
        </div>
      </section>
    </main>
  )
}

export default function TwinPage() {
  return (
    <>
      <TwinHero />
      <ScrollStatement />
      <NodeGraph />
    </>
  )
}
