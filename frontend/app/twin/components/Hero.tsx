'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import DotFloor from './DotFloor'
import KpiCard from './KpiCard'
import Nav from './Nav'
import SimulateBar from './SimulateBar'

const cards = [
  { label: 'Conversion', value: '−7%' },
  { label: 'Revenue', value: '+8.2%' },
  { label: 'Churn', value: '+0.4pp' },
  { label: 'Cash', value: '+$420k' },
]

const headline = 'Simulate the decision before you make it.'

export default function Hero() {
  const [runId, setRunId] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(preference.matches)
    setMounted(true)
    const updatePreference = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches)
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  const simulate = useCallback(() => {
    setRunId((current) => current + 1)
  }, [])

  return (
    <section
      id="product"
      aria-label="Twin decision simulator"
      className="twin-hero relative isolate min-h-[100svh] overflow-hidden bg-[#0A0B0D] text-white"
      style={{ fontFamily: 'Inter, Geist, ui-sans-serif, system-ui, sans-serif' }}
    >
      <DotFloor pulseKey={runId} />
      <div className="twin-hero-content pointer-events-none relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col px-4 pb-12 pt-5 sm:px-8 sm:pb-12 lg:px-12">
        <Nav />
        <div className="pointer-events-auto mt-6 sm:mt-7">
          <SimulateBar onSimulate={simulate} />
        </div>

        <div
          aria-label="Business simulation preview"
          className="pointer-events-none relative z-10 mx-auto mt-7 grid w-full max-w-[1060px] grid-cols-4 gap-2 sm:gap-4 md:w-[84%]"
        >
          {cards.map((card, index) => (
            <KpiCard
              key={card.label}
              label={card.label}
              value={card.value}
              index={index}
              runId={runId}
            />
          ))}
        </div>

        <div className="mt-auto grid items-end gap-7 pt-10 sm:pt-12 md:grid-cols-[minmax(0,1fr)_270px] md:gap-10">
          <div className="max-w-[760px]">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#86EFAC]">
              Decision simulator
            </p>
            <h1 className="twin-hero-headline max-w-[16ch] text-[clamp(2.25rem,4.5vw,4rem)] font-medium leading-[1.02] tracking-[-0.075em] text-white">
              {headline.split(' ').map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className={`mr-[0.2em] inline-block ${
                    mounted && !reducedMotion ? 'twin-hero-word' : ''
                  }`}
                  style={{
                    animationDelay: `${mounted && !reducedMotion ? index * 65 : 0}ms`,
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="/login"
                className="pointer-events-auto group inline-flex items-center gap-3 rounded-full border border-[#86EFAC]/15 bg-[#22C55E] py-1.5 pl-5 pr-1.5 text-sm font-semibold text-[#07120d] shadow-[0_0_38px_rgba(34,197,94,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#86EFAC] active:scale-[0.97]"
              >
                Build your Business Twin
                <span className="grid size-8 place-items-center rounded-full bg-[#0A0B0D] text-[#86EFAC]">
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </a>
              <a
                href="#twin-statement"
                className="pointer-events-auto inline-flex items-center rounded-full border border-white/[0.12] bg-[#101412]/75 px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#86EFAC]"
              >
                See how it works
              </a>
            </div>
          </div>
          <p className="max-w-[270px] text-xs leading-5 text-white/45 md:ml-auto md:text-right">
            See how every decision ripples through your business — before it
            touches reality.
          </p>
        </div>
      </div>
    </section>
  )
}
