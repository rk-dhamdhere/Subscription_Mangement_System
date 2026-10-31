'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Menu,
  MousePointer2,
  Network,
  Sparkles,
  ToggleRight,
  X,
} from 'lucide-react'
import {
  motion,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import Footer from '../components/Footer'

type Scenario = 'price' | 'ads' | 'hire'
type NodeId = 'Pricing' | 'Marketing' | 'Costs' | 'Customers' | 'Revenue' | 'Cash'

const presets: { label: string; scenario: Scenario }[] = [
  { label: 'Price +8%', scenario: 'price' },
  { label: 'Paid ads -30%', scenario: 'ads' },
  { label: 'Hire 10 people', scenario: 'hire' },
]

const nodeData: {
  id: NodeId
  x: number
  y: number
  value: string
  descriptor: string
  delta: string
  trace: string
}[] = [
  { id: 'Pricing', x: 19, y: 25, value: '$99', descriptor: 'ARPA / mo', delta: '+2%', trace: '−7% conversion' },
  { id: 'Marketing', x: 81, y: 25, value: '$184', descriptor: 'paid CAC', delta: '−30% spend', trace: '+3.4% customers' },
  { id: 'Costs', x: 17, y: 66, value: '36%', descriptor: 'COGS', delta: '−1.2pp', trace: '36% of revenue' },
  { id: 'Customers', x: 83, y: 65, value: '4,820', descriptor: 'active', delta: '+3.4%', trace: '+3.4% customers' },
  { id: 'Revenue', x: 34, y: 87, value: '$8.4M', descriptor: 'ARR', delta: '+8.2%', trace: '+8.2% revenue' },
  { id: 'Cash', x: 70, y: 87, value: '$1.9M', descriptor: '14 mo runway', delta: '+$280k', trace: '+$280k cash' },
]

const inspectorEffects: Record<NodeId, string[]> = {
  Cash: ['Pricing $99', 'Marketing $184', 'Costs 36%'],
  Pricing: ['Conversion −7%', 'Revenue +8.2%', 'Cash - 12 mo +$420k'],
  Marketing: ['Customers +3.4%', 'Revenue +5.1%', 'Cash +$280k'],
  Costs: ['COGS 36%', 'Gross margin +1.2pp', 'Cash +$96k'],
  Customers: ['Conversion +3.4%', 'Churn +0.4pp', 'Revenue +8.2%'],
  Revenue: ['Pricing +8%', 'Customers +3.4%', 'Cash +$420k'],
}

const initialPositions = Object.fromEntries(
  nodeData.map(({ id, x, y }) => [id, { x, y }]),
) as Record<NodeId, { x: number; y: number }>

function Logo() {
  return (
    <a href="/" className="flex items-center" aria-label="Twin home">
      <Image
        src="/twin-logo.png"
        alt="TWIN Logo"
        width={60}
        height={60}
        sizes="60px"
        className="size-[60px] object-cover"
        priority
      />
    </a>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    ['Product', '#product'],
    ['Twin', '/twin'],
    ['Simulate', '#simulate'],
    ['Compare', '#compare'],
    ['Intelligence', '#intelligence'],
    ['Memory', '#memory'],
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#080908]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={label} href={href} className="text-[12px] text-neutral-400 transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <a href="/login" className="text-[12px] text-neutral-400 transition-colors hover:text-white">Log in</a>
          <a href="/login" className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-400 px-4 text-[12px] font-semibold text-[#07120d] transition hover:bg-emerald-300">
            Get started <ArrowRight className="size-3.5" />
          </a>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full border border-white/10 text-neutral-200 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {menuOpen && (
        <nav className="border-t border-white/[0.06] bg-[#080908] px-5 py-5 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
            {links.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)} className="text-sm text-neutral-300">
                {label}
              </a>
            ))}
            <div className="flex items-center gap-5 border-t border-white/10 pt-4">
              <a href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-neutral-400">Log in</a>
              <a href="/login" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-[#07120d]">
                Get started <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}

function WaveCanvas({ runId }: { runId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runIdRef = useRef(runId)
  const pulseStartRef = useRef(0)

  useEffect(() => {
    runIdRef.current = runId
    pulseStartRef.current = performance.now()
  }, [runId])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    type Dot = {
      x: number
      y: number
      depth: number
      phase: number
      glows: boolean
    }

    let frame = 0
    let width = 0
    let height = 0
    let ratio = 1
    let dots: Dot[] = []
    let visible = false
    let reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let lastFrameTime = 0
    const frameInterval = 1000 / 60

    const buildGrid = () => {
      const bounds = canvas.getBoundingClientRect()
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      const mobile = window.matchMedia('(max-width: 767px)').matches
      const rowCount = mobile ? 20 : 32
      const horizon = height * 0.12
      const floorDepth = height - horizon
      const nextDots: Dot[] = []

      for (let row = 0; row < rowCount; row += 1) {
        const depth = row / (rowCount - 1)
        const y = horizon + Math.pow(depth, 1.65) * floorDepth
        const spacing = (mobile ? 18 : 15) + depth * (mobile ? 10 : 14)
        const columnCount = Math.ceil(width / spacing) + 1
        const startX = (width - (columnCount - 1) * spacing) / 2

        for (let column = 0; column < columnCount; column += 1) {
          nextDots.push({
            x: startX + column * spacing,
            y,
            depth,
            phase: (column * 0.47 + row * 0.83) % (Math.PI * 2),
            glows: (column * 7 + row * 13) % 29 === 0,
          })
        }
      }

      dots = nextDots
      lastFrameTime = 0
      if (reducedMotion) {
        draw(performance.now(), true)
      } else {
        scheduleFrame()
      }
    }

    const draw = (time: number, staticFrame = false) => {
      context.clearRect(0, 0, width, height)
      const pulseElapsed = time - pulseStartRef.current
      const pulseActive = runIdRef.current > 0 && pulseElapsed < 1800
      const pulseProgress = pulseActive ? pulseElapsed / 1800 : -1
      const pulseX = pulseProgress * width
      const timeSeconds = time / 1000

      for (const dot of dots) {
        const wave = Math.sin(
          dot.x * 0.012 + dot.phase + timeSeconds * 0.62,
        )
        const crossWave = Math.cos(
          dot.x * 0.006 - dot.phase * 0.7 + timeSeconds * 0.42,
        )
        const displacement =
          dot.depth * (wave * 3.2 + crossWave * 1.2)
        const x = dot.x + dot.depth * wave * 1.5
        const y = dot.y + displacement
        const pulseDistance = pulseActive
          ? Math.abs(dot.x - pulseX)
          : Number.POSITIVE_INFINITY
        const pulse = pulseDistance < 90 ? 1 - pulseDistance / 90 : 0
        const shimmer = reducedMotion
          ? 0
          : (Math.sin(dot.phase + timeSeconds * 0.58) + 1) * 0.5
        const alpha = Math.min(
          0.62,
          0.055 + dot.depth * 0.2 + shimmer * (0.035 + dot.depth * 0.08) +
            pulse * 0.18,
        )
        const radius =
          0.55 + dot.depth * 0.3 + (dot.glows ? 0.2 + pulse * 0.25 : 0)

        if (dot.glows && !reducedMotion) {
          context.beginPath()
          context.arc(x, y, radius * 2.4, 0, Math.PI * 2)
          context.fillStyle = `rgba(16, 185, 129, ${alpha * 0.12})`
          context.fill()
        }

        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(52, 211, 153, ${alpha})`
        context.fill()
      }

      lastFrameTime = time
      if (!staticFrame && !reducedMotion && visible && !document.hidden) {
        frame = window.requestAnimationFrame(renderFrame)
      }
    }

    function renderFrame(time: number) {
      frame = 0
      if (!visible || document.hidden) return
      if (time - lastFrameTime < frameInterval) {
        scheduleFrame()
        return
      }
      draw(time)
    }

    function scheduleFrame() {
      if (visible && !document.hidden && !reducedMotion && !frame) {
        frame = window.requestAnimationFrame(renderFrame)
      }
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) {
        if (reducedMotion) draw(performance.now(), true)
        else scheduleFrame()
      } else if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
    })
    const resizeObserver = new ResizeObserver(buildGrid)
    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
      if (reducedMotion) {
        if (frame) window.cancelAnimationFrame(frame)
        frame = 0
        draw(performance.now(), true)
      } else {
        lastFrameTime = 0
        scheduleFrame()
      }
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (frame) window.cancelAnimationFrame(frame)
        frame = 0
      } else if (reducedMotion) {
        draw(performance.now(), true)
      } else {
        lastFrameTime = 0
        scheduleFrame()
      }
    }

    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    motionPreference.addEventListener('change', onMotionPreferenceChange)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      motionPreference.removeEventListener('change', onMotionPreferenceChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true" />
}

function TypewriterHeading() {
  const title = 'Simulate the decision before you make it.'

  return (
    <motion.h1
      aria-label={title}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.025, delayChildren: 0.2 } } }}
      className="mx-auto max-w-[850px] text-balance text-[42px] font-medium leading-[1.03] tracking-[-0.065em] text-white sm:text-[64px] lg:text-[78px]"
    >
      {Array.from(title).map((character, index) => (
        <motion.span
          aria-hidden="true"
          key={`${character}-${index}`}
          variants={{
            hidden: { opacity: 0, y: 12, filter: 'blur(5px)' },
            visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.28 } },
          }}
        >
          {character === ' ' ? '\u00a0' : character}
        </motion.span>
      ))}
    </motion.h1>
  )
}

function SimulatorHero({
  onSimulate,
  runId,
  scenario,
}: {
  onSimulate: (nextScenario: Scenario) => void
  runId: number
  scenario: Scenario
}) {
  const [prompt, setPrompt] = useState('What if we raise prices by 15%?')

  function submit(nextScenario?: Scenario) {
    const selectedScenario = nextScenario ?? (
      /ads|marketing|spend/i.test(prompt) ? 'ads' : /hire|headcount|people/i.test(prompt) ? 'hire' : 'price'
    )
    const nextPrompt = nextScenario
      ? presets.find((preset) => preset.scenario === nextScenario)?.label ?? prompt
      : prompt
    setPrompt(nextPrompt)
    onSimulate(selectedScenario)
  }

  return (
    <section id="product" className="relative overflow-hidden px-5 pb-10 pt-[116px] sm:px-8 sm:pt-[136px]">
      <div className="pointer-events-none absolute inset-x-0 top-[220px] h-[490px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(16,185,129,0.12),transparent_58%)]" />
        <WaveCanvas runId={runId} />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#070807]" />
      </div>
      <div className="relative z-10 mx-auto max-w-[1060px]">
        <div id="simulate" className="scroll-mt-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 flex flex-wrap items-center justify-center gap-2"
          >
            {presets.map(({ label, scenario: presetScenario }) => (
              <button
                type="button"
                key={label}
                onClick={() => submit(presetScenario)}
                className={`rounded-full border px-3.5 py-1.5 text-[11px] transition ${
                  scenario === presetScenario && runId > 0
                    ? 'border-emerald-300/35 bg-emerald-300/[0.09] text-emerald-200'
                    : 'border-white/[0.09] bg-white/[0.025] text-neutral-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="mx-auto flex min-h-[66px] max-w-[720px] items-center gap-3 rounded-[20px] border border-white/[0.12] bg-[#101210]/90 p-2 pl-5 shadow-[0_16px_80px_rgba(0,0,0,0.38),0_0_50px_rgba(16,185,129,0.06)] backdrop-blur-xl sm:min-h-[74px] sm:pl-6"
          >
            <Sparkles className="hidden size-4 shrink-0 text-emerald-300/75 sm:block" />
            <input
              aria-label="Describe a business decision to simulate"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-left text-[13px] text-neutral-200 outline-none placeholder:text-neutral-600 sm:text-sm"
              placeholder="What decision are you considering?"
            />
            <button type="submit" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[13px] bg-emerald-400 px-4 text-xs font-semibold text-[#06110b] shadow-[0_0_28px_rgba(16,185,129,0.17)] transition hover:bg-emerald-300 sm:px-5">
              Simulate <ArrowRight className="size-3.5" />
            </button>
          </motion.form>
        </div>

        <div className="relative mx-auto mt-12 max-w-[960px] sm:mt-[72px]">
          <svg viewBox="0 0 1000 130" preserveAspectRatio="none" className="pointer-events-none absolute left-0 top-7 hidden h-[115px] w-full md:block" aria-hidden="true">
            <defs>
              <linearGradient id="hero-path" x1="0" x2="1">
                <stop offset="0" stopColor="#10b981" stopOpacity=".12" />
                <stop offset=".5" stopColor="#10b981" stopOpacity=".6" />
                <stop offset="1" stopColor="#10b981" stopOpacity=".12" />
              </linearGradient>
              <filter id="pulse-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <motion.path
              d="M125 54 C210 54 210 88 375 69 S565 39 625 57 S800 87 875 54"
              fill="none"
              stroke="url(#hero-path)"
              strokeWidth="1.3"
              strokeDasharray="3 7"
              animate={{ strokeDashoffset: runId % 2 ? -40 : 0 }}
              transition={{ duration: 1.1 }}
            />
            {runId > 0 && (
              <motion.circle
                r="4"
                fill="#6ee7b7"
                filter="url(#pulse-glow)"
                initial={{ cx: 80, cy: 55, opacity: 0 }}
                animate={{ cx: 920, cy: 55, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              >
              </motion.circle>
            )}
          </svg>
          <div
            className="relative h-[210px] w-full sm:h-[230px]"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute inset-0 grid place-items-center"
            >
              <Image
                src="/twin-logo-emerald.png"
                alt="TWIN Logo"
                width={520}
                height={517}
                sizes="(max-width: 640px) 104px, (max-width: 768px) 128px, 146px"
                className="h-auto w-[104px] drop-shadow-[0_0_16px_rgba(34,197,94,0.2)] sm:w-32 md:w-[146px]"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>

        <div className="mt-[72px] grid items-end gap-8 border-t border-white/[0.07] pt-9 sm:mt-[95px] sm:grid-cols-[1fr_auto] sm:pt-12">
          <div>
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-300/80">DECISION SIMULATOR</p>
            <TypewriterHeading />
            <div className="mt-7 flex flex-wrap justify-center gap-3 sm:justify-start">
              <a href="/login" className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-400 px-5 text-xs font-semibold text-[#07120d] transition hover:bg-emerald-300">
                Build your Business Twin <ArrowRight className="size-3.5" />
              </a>
              <a href="#compare" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.025] px-5 text-xs font-medium text-neutral-200 transition hover:border-white/25 hover:bg-white/[0.05]">
                See how it works <ArrowDown className="size-3.5" />
              </a>
            </div>
          </div>
          <p className="max-w-[260px] pb-1 text-[12px] leading-6 text-neutral-500 sm:text-right">
            See how every decision ripples through your business — before it touches reality.
          </p>
        </div>
      </div>
    </section>
  )
}

const integrations = [
  { name: 'Mixpanel', value: '3.78%', left: '14%', top: '31%', icon: BarChart3 },
  { name: 'Stripe', value: '$708k', left: '83%', top: '30%', icon: Activity },
  { name: 'HubSpot', value: '$2.50M', left: '22%', top: '69%', icon: Network },
  { name: 'QuickBooks', value: '$1.86M', left: '76%', top: '72%', icon: Check },
  { name: 'Meta Ads', value: '$183', left: '50%', top: '18%', icon: ArrowUpRight },
]

function FlowBadge({
  name,
  value,
  left,
  top,
  icon: Icon,
  progress,
}: (typeof integrations)[number] & { progress: MotionValue<number> }) {
  const badgeLeft = useTransform(progress, [0, 0.72], [left, '50%'])
  const badgeTop = useTransform(progress, [0, 0.72], [top, '50%'])
  const opacity = useTransform(progress, [0, 0.34, 0.69, 0.78], [1, 1, 0, 0])
  const scale = useTransform(progress, [0, 0.68, 0.78], [1, 0.92, 0.7])

  return (
    <motion.div
      style={{ left: badgeLeft, top: badgeTop, opacity, scale }}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 whitespace-nowrap rounded-2xl border border-white/[0.1] bg-[#111411]/90 px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-white/[0.045] text-emerald-300"><Icon className="size-4" /></span>
      <span className="text-left">
        <span className="block text-[11px] text-neutral-500">{name}</span>
        <span className="mt-0.5 block text-sm font-medium tracking-tight text-neutral-100">{value}</span>
      </span>
      <span className="ml-1 size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
    </motion.div>
  )
}

function DataGlowSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const coreOpacity = useTransform(scrollYProgress, [0.58, 0.78], [0, 1])
  const coreScale = useTransform(scrollYProgress, [0.58, 0.8], [0.55, 1])
  const labelOpacity = useTransform(scrollYProgress, [0.72, 0.88], [0, 1])

  return (
    <section ref={sectionRef} id="compare" className="relative min-h-[175vh] border-t border-white/[0.06] bg-[#090a09] px-5 sm:px-8">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_57%,rgba(16,185,129,0.07),transparent_48%)]" />
        <div className="relative mx-auto w-full max-w-[1100px]">
          <motion.div
            initial={{ opacity: 0, y: 42 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7 }}
            className="relative z-20 text-center"
          >
            <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-300/80">One source of truth</p>
            <h2 className="mx-auto max-w-[820px] text-balance text-[35px] font-medium leading-[1.08] tracking-[-0.055em] text-white sm:text-[54px]">
              Your data is everywhere. Your dashboards show the past. Twin shows what&apos;s next.
            </h2>
          </motion.div>
          <div className="relative mx-auto mt-8 h-[430px] max-w-[960px] sm:mt-0 sm:h-[500px]">
            <div className="absolute left-1/2 top-1/2 size-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/[0.07] sm:size-[390px]" />
            <div className="absolute left-1/2 top-1/2 size-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.045] sm:size-[300px]" />
            {integrations.map((integration) => (
              <FlowBadge key={integration.name} {...integration} progress={scrollYProgress} />
            ))}
            <motion.div
              style={{ opacity: coreOpacity, scale: coreScale }}
              className="absolute left-1/2 top-1/2 z-20 grid size-[76px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[23px] border border-emerald-300/25 bg-[#111713] shadow-[0_0_0_12px_rgba(16,185,129,0.035),0_0_70px_rgba(16,185,129,0.2)]"
            >
              <ToggleRight className="size-9 text-emerald-300" />
            </motion.div>
            <motion.p style={{ opacity: labelOpacity }} className="absolute left-1/2 top-[calc(50%+61px)] z-20 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-neutral-300">
              One connected model
            </motion.p>
            <div className="absolute inset-x-0 bottom-1 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[9px] uppercase tracking-[0.17em] text-neutral-600">
                <MousePointer2 className="size-3" /> Scroll to connect the dots
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Sparkline({ selected }: { selected: NodeId }) {
  const isPricing = selected === 'Pricing'
  return (
    <svg viewBox="0 0 280 74" className="h-[74px] w-full" role="img" aria-label={`${selected} trend chart`}>
      <defs>
        <linearGradient id="inspector-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#34d399" stopOpacity=".25" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={isPricing
          ? 'M0 57 C25 55 31 44 52 47 S77 51 98 37 S133 42 150 29 S177 35 196 21 S233 24 250 11 S268 12 280 5 V74 H0Z'
          : 'M0 58 C22 58 31 48 48 51 S77 40 95 43 S119 28 140 34 S166 26 187 30 S213 13 231 17 S261 12 280 5 V74 H0Z'}
        fill="url(#inspector-fill)"
      />
      <motion.path
        d={isPricing
          ? 'M0 57 C25 55 31 44 52 47 S77 51 98 37 S133 42 150 29 S177 35 196 21 S233 24 250 11 S268 12 280 5'
          : 'M0 58 C22 58 31 48 48 51 S77 40 95 43 S119 28 140 34 S166 26 187 30 S213 13 231 17 S261 12 280 5'}
        fill="none"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0.75 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
      <path d="M0 70 H280" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
    </svg>
  )
}

function NetworkNodeCard({
  node,
  position,
  index,
  isActive,
  graphRef,
  onSelect,
  onPositionChange,
}: {
  node: (typeof nodeData)[number]
  position: { x: number; y: number }
  index: number
  isActive: boolean
  graphRef: { current: HTMLDivElement | null }
  onSelect: (node: NodeId) => void
  onPositionChange: (node: NodeId, deltaX: number, deltaY: number) => void
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  return (
    <motion.button
      type="button"
      drag
      dragConstraints={graphRef}
      dragMomentum={false}
      dragElastic={0.06}
      onDragEnd={(_, info) => {
        const bounds = graphRef.current?.getBoundingClientRect()
        if (bounds) onPositionChange(node.id, info.offset.x / bounds.width * 100, info.offset.y / bounds.height * 100)
        x.set(0)
        y.set(0)
      }}
      initial={{ opacity: 0, scale: 0.82 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: 0.12 + index * 0.07, type: 'spring', stiffness: 180, damping: 20 }}
      onMouseEnter={() => onSelect(node.id)}
      onFocus={() => onSelect(node.id)}
      onClick={() => onSelect(node.id)}
      style={{ left: `${position.x}%`, top: `${position.y}%`, x, y }}
      className={`absolute z-20 min-w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border px-3 py-2.5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-colors sm:min-w-[140px] sm:rounded-[16px] sm:px-3.5 sm:py-3 ${
        isActive
          ? 'border-emerald-300/55 bg-[#122019] shadow-[0_0_28px_rgba(16,185,129,0.16)]'
          : 'border-white/[0.11] bg-[#101311]/95 hover:border-emerald-300/35'
      } cursor-grab active:cursor-grabbing`}
    >
      <span className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-300 shadow-[0_0_9px_rgba(52,211,153,.9)]' : 'bg-neutral-500'}`} />
        <span className="text-[10px] font-medium text-neutral-100 sm:text-[11px]">{node.id}</span>
      </span>
      <span className="mt-1.5 block whitespace-nowrap text-[11px] tracking-tight text-neutral-400 sm:text-xs">
        {node.value} <span className="text-neutral-600">{node.descriptor}</span>
      </span>
      {isActive && <span className="mt-2 block text-[9px] text-emerald-300 sm:hidden">{node.trace}</span>}
    </motion.button>
  )
}

function NetworkModel({
  selected,
  setSelected,
}: {
  selected: NodeId
  setSelected: (node: NodeId) => void
}) {
  const [positions, setPositions] = useState(initialPositions)
  const graphRef = useRef<HTMLDivElement>(null)
  const active = nodeData.find((node) => node.id === selected) ?? nodeData[5]
  const isPricing = selected === 'Pricing'
  const effects = inspectorEffects[selected]

  return (
    <section id="intelligence" className="border-t border-white/[0.06] bg-[#070807] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1120px]">
        <motion.div
          initial={{ opacity: 0, y: 42 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7 }}
          className="mb-11 flex flex-col gap-5 sm:mb-14 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-300/80">THE TWIN</p>
            <h2 className="text-balance text-[36px] font-medium leading-[1.06] tracking-[-0.055em] text-white sm:text-[54px]">
              Your entire business. One connected model.
            </h2>
          </div>
          <p className="max-w-[300px] pb-1 text-[13px] leading-6 text-neutral-500 sm:text-right">
            Revenue, customers, costs and cash in one living model.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="grid min-h-[620px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0c0f0d] lg:grid-cols-[0.73fr_1.27fr]"
        >
          <aside id="memory" className="scroll-mt-24 border-b border-white/[0.08] bg-white/[0.018] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Live inspector</p>
              <span className="inline-flex items-center gap-2 text-[10px] text-emerald-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                LIVE
              </span>
            </div>
            <div className="mt-9">
              <p className="text-xs text-neutral-500">Selected node</p>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
                <motion.h3 key={selected} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[25px] font-medium tracking-[-0.045em] text-white">
                  {selected}
                </motion.h3>
              </div>
              <p className="mt-1 text-xs text-neutral-400">{active.descriptor}</p>
              <motion.div
                key={`value-${selected}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-[18px] border border-emerald-300/[0.14] bg-emerald-300/[0.035] p-4"
              >
                <div className="flex items-end justify-between gap-3">
                  <span className="text-[34px] font-medium leading-none tracking-[-0.06em] text-white">{active.value}</span>
                  <span className="text-[11px] font-medium text-emerald-300">
                    {selected === 'Cash' ? '14 mo runway' : active.delta}
                  </span>
                </div>
                <div className="mt-5"><Sparkline selected={selected} /></div>
                <p className="mt-1 text-[10px] text-neutral-500">
                  {isPricing ? 'ARPA / mo' : selected === 'Cash' ? '14 mo runway' : active.descriptor}
                </p>
              </motion.div>
            </div>
            <div className="mt-7 border-t border-white/[0.08] pt-5">
              <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.19em] text-neutral-500">RIPPLE EFFECTS</p>
              <div className="flex flex-wrap gap-2">
                {effects.map((effect, index) => (
                  <motion.span
                    key={`${selected}-${effect}`}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.06 }}
                    className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-neutral-300"
                  >
                    {effect}
                  </motion.span>
                ))}
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-5">
              <div><p className="text-[9px] uppercase tracking-wider text-neutral-600">Conversion</p><p className="mt-2 text-xs text-neutral-200">{isPricing ? '−7%' : '+3.4%'}</p></div>
              <div><p className="text-[9px] uppercase tracking-wider text-neutral-600">Revenue</p><p className="mt-2 text-xs text-emerald-300">+8.2%</p></div>
              <div><p className="text-[9px] uppercase tracking-wider text-neutral-600">Cash</p><p className="mt-2 text-xs text-neutral-200">+$420k</p></div>
            </div>
          </aside>

          <div
            ref={graphRef}
            className="relative min-h-[510px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_48%,rgba(16,185,129,0.075),transparent_38%),linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:auto,36px_36px,36px_36px] sm:min-h-[600px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_20%,rgba(7,8,7,0.4)_100%)]" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <defs>
                <filter id="network-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {nodeData.map((node, index) => {
                const position = positions[node.id]
                const midpointX = (50 + position.x) / 2
                const midpointY = (48 + position.y) / 2 - (index % 2 === 0 ? 8 : -8)
                const isActive = selected === node.id
                return (
                  <g key={node.id}>
                    <motion.path
                      d={`M 50 48 Q ${midpointX} ${midpointY} ${position.x} ${position.y}`}
                      fill="none"
                      stroke={isActive ? 'rgba(52,211,153,.62)' : 'rgba(255,255,255,.14)'}
                      strokeWidth={isActive ? '0.42' : '0.24'}
                      strokeDasharray={isActive ? '1.2 1.3' : '0.8 1.8'}
                      animate={{ strokeDashoffset: isActive ? [0, -16] : [0, -8] }}
                      transition={{ duration: isActive ? 1.2 : 3.2, repeat: Infinity, ease: 'linear' }}
                      filter={isActive ? 'url(#network-glow)' : undefined}
                    />
                    {isActive && (
                      <motion.circle
                        r="0.85"
                        fill="#6ee7b7"
                        filter="url(#network-glow)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], cx: [50, midpointX, position.x], cy: [48, midpointY, position.y] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.25, ease: 'easeInOut' }}
                      />
                    )}
                  </g>
                )
              })}
            </svg>
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 180, damping: 20 }}
              className="absolute left-1/2 top-[48%] z-10 grid size-[74px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[23px] border border-emerald-300/25 bg-[#111713] shadow-[0_0_0_10px_rgba(16,185,129,0.035),0_0_55px_rgba(16,185,129,0.17)] sm:size-[86px]"
            >
              <ToggleRight className="size-8 text-emerald-300 sm:size-9" />
              <span className="absolute -bottom-7 whitespace-nowrap text-[9px] uppercase tracking-[0.19em] text-neutral-600">One connected model</span>
            </motion.div>
            {nodeData.map((node, index) => {
              const position = positions[node.id]
              const isActive = selected === node.id
              const labelX = (50 + position.x) / 2
              const labelY = (48 + position.y) / 2 - (index % 2 === 0 ? 9 : -9)

              return (
                <span
                  key={`trace-${node.id}`}
                  className="pointer-events-none absolute z-[5] hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-emerald-300/15 bg-[#0b110e]/90 px-2 py-1 text-[8px] text-emerald-200/80 sm:block"
                  style={{ left: `${labelX}%`, top: `${labelY}%`, opacity: isActive ? 1 : 0 }}
                >
                  {node.trace}
                </span>
              )
            })}
            {nodeData.map((node, index) => {
              const position = positions[node.id]
              const isActive = selected === node.id
              return (
                <NetworkNodeCard
                  key={node.id}
                  node={node}
                  position={position}
                  index={index}
                  isActive={isActive}
                  graphRef={graphRef}
                  onSelect={setSelected}
                  onPositionChange={(id, deltaX, deltaY) => {
                    setPositions((current) => ({
                      ...current,
                      [id]: {
                        x: Math.max(12, Math.min(88, current[id].x + deltaX)),
                        y: Math.max(14, Math.min(90, current[id].y + deltaY)),
                      },
                    }))
                  }}
                />
              )
            })}
            <p className="absolute bottom-5 left-5 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-neutral-600 sm:left-7">
              <MousePointer2 className="size-3" /> Drag any node · hover to trace
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default function Page() {
  const [selectedNode, setSelectedNode] = useState<NodeId>('Cash')
  const [simulationRun, setSimulationRun] = useState(0)
  const [scenario, setScenario] = useState<Scenario>('price')

  function simulate(nextScenario: Scenario) {
    setScenario(nextScenario)
    setSelectedNode('Pricing')
    setSimulationRun((run) => run + 1)
  }

  return (
    <main id="top" className="min-h-screen overflow-x-clip bg-[#070807] text-white">
      <Header />
      <SimulatorHero onSimulate={simulate} runId={simulationRun} scenario={scenario} />
      <DataGlowSection />
      <NetworkModel selected={selectedNode} setSelected={setSelectedNode} />
      <Footer />
    </main>
  )
}
