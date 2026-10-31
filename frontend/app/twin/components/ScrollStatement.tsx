'use client'

import { useEffect, useRef } from 'react'
import { Activity, CircleDollarSign, CreditCard, Database, Megaphone } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type DataSource = {
  name: string
  metric: string
  description: string
  icon: typeof Activity
  chart: 'arc' | 'line' | 'bars'
  position: { left: string; top: string }
  parallax: number
  tilt: number
}

const sources: DataSource[] = [
  {
    name: 'Mixpanel',
    metric: '3.78%',
    description: 'churn',
    icon: Activity,
    chart: 'arc',
    position: { left: '16%', top: '25%' },
    parallax: -30,
    tilt: -1,
  },
  {
    name: 'Stripe',
    metric: '$708k',
    description: 'MRR',
    icon: CreditCard,
    chart: 'line',
    position: { left: '84%', top: '23%' },
    parallax: 24,
    tilt: 1,
  },
  {
    name: 'HubSpot',
    metric: '$2.50M',
    description: 'pipeline',
    icon: Database,
    chart: 'line',
    position: { left: '14%', top: '75%' },
    parallax: 38,
    tilt: 1,
  },
  {
    name: 'QuickBooks',
    metric: '$1.86M',
    description: 'cash',
    icon: CircleDollarSign,
    chart: 'line',
    position: { left: '86%', top: '75%' },
    parallax: -26,
    tilt: -1,
  },
  {
    name: 'Meta Ads',
    metric: '$183',
    description: 'CAC',
    icon: Megaphone,
    chart: 'bars',
    position: { left: '50%', top: '12%' },
    parallax: -42,
    tilt: 1,
  },
]

const statementLines = [
  ['Your', 'data', 'is', 'everywhere.'],
  ['Your', 'dashboards', 'show', 'the', 'past.'],
  ['Twin', 'shows', "what's", 'next.'],
]

function MiniChart({ type }: { type: DataSource['chart'] }) {
  if (type === 'arc') {
    return (
      <svg viewBox="0 0 64 36" aria-hidden="true" className="h-9 w-16">
        <path
          d="M7 29a25 25 0 0 1 50 0"
          fill="none"
          stroke="rgba(255,255,255,.13)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M7 29a25 25 0 0 1 35-22"
          fill="none"
          stroke="#22C55E"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="42" cy="7" r="2.5" fill="#86EFAC" />
      </svg>
    )
  }

  if (type === 'bars') {
    return (
      <svg viewBox="0 0 72 36" aria-hidden="true" className="h-9 w-[72px]">
        {[11, 19, 14, 25, 21, 32, 27, 35].map((height, index) => (
          <rect
            key={index}
            x={index * 9 + 1}
            y={36 - height}
            width="5"
            height={height}
            rx="2.5"
            fill={index === 7 ? '#86EFAC' : '#22C55E'}
            opacity={0.25 + index * 0.09}
          />
        ))}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 96 36" aria-hidden="true" className="h-9 w-24">
      <path
        d="M2 28c10-1 11-13 22-10s10 7 19 1 12 4 20-2 13-9 19-4 9-4 12-8"
        fill="none"
        stroke="rgba(34,197,94,.22)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M2 28c10-1 11-13 22-10s10 7 19 1 12 4 20-2 13-9 19-4 9-4 12-8"
        fill="none"
        stroke="#22C55E"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="94" cy="5" r="2.2" fill="#86EFAC" />
    </svg>
  )
}

export default function ScrollStatement() {
  const sectionRef = useRef<HTMLElement>(null)
  const greenRiseRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)
  const cardInnerRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    gsap.registerPlugin(ScrollTrigger)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return

    let disposed = false
    let removePointerListeners = () => {}
    let clearTiltTimer = 0
    const context = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>('.twin-statement-word', section)
      const lastWords = gsap.utils.toArray<HTMLElement>('.twin-last-word', section)
      const cards = gsap.utils.toArray<HTMLElement>('.twin-source-card', section)
      const logo = section.querySelector<HTMLElement>('.twin-connected-logo')
      const caption = section.querySelector<HTMLElement>('.twin-connected-caption')
      const floorCanvas = document.querySelector<HTMLElement>('.twin-dot-floor')
      const greenRise = greenRiseRef.current
      const fade = fadeRef.current

      gsap.set(words, { opacity: 0.25 })
      gsap.set(lastWords, { opacity: 0.25 })
      gsap.set(logo, { opacity: 0, scale: 0.45 })
      gsap.set(caption, { opacity: 0, y: 8 })
      gsap.set(fade, { opacity: 0 })

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            cards.forEach((card) => {
              card.style.willChange = self.isActive ? 'transform' : ''
            })
          },
        },
      })

      timeline
        .to(greenRise, { scaleY: 1, duration: 1.6 }, 0)
        .to(floorCanvas, { opacity: 0, duration: 0.9 }, 0)
        .to(
          words.filter((word) => !word.classList.contains('twin-last-word')),
          { opacity: 1, duration: 0.8, stagger: 0.06 },
          0.15,
        )
        .to(
          cards,
          {
            y: (_index, target) =>
              Number((target as HTMLElement).dataset.parallax ?? 0),
            rotationZ: (_index, target) =>
              Number((target as HTMLElement).dataset.tilt ?? 0),
            duration: 1,
            stagger: 0.025,
          },
          0.25,
        )
        .to(lastWords, { opacity: 1, duration: 0.22, stagger: 0.08 }, 2.15)
        .to(
          cards,
          {
            x: (_index, target) =>
              section.clientWidth / 2 - (target as HTMLElement).offsetLeft,
            y: (_index, target) =>
              section.clientHeight / 2 - (target as HTMLElement).offsetTop,
            scale: 0.08,
            opacity: 0,
            duration: 0.7,
            stagger: 0.035,
          },
          1.95,
        )
        .to(words, { opacity: 0, duration: 0.2 }, 2.49)
        .to(logo, { opacity: 1, scale: 1, duration: 0.28 }, 2.51)
        .to(caption, { opacity: 1, y: 0, duration: 0.26 }, 2.59)
        .to(fade, { opacity: 1, duration: 0.45 }, 2.35)

      const tiltTargets = cardInnerRefs.current.filter(
        (element): element is HTMLDivElement => element !== null,
      )
      const baseTiltX = tiltTargets.map((_element, index) =>
        index % 2 === 0 ? 2.5 : -2.5,
      )
      const baseTiltY = tiltTargets.map(
        (_element, index) => (sources[index]?.tilt ?? 1) * 3,
      )
      tiltTargets.forEach((element, index) => {
        gsap.set(element, {
          rotationX: baseTiltX[index],
          rotationY: baseTiltY[index],
        })
        element.style.willChange = ''
      })
      const tiltX = tiltTargets.map((element) =>
        gsap.quickTo(element, 'rotationX', {
          duration: 0.4,
          ease: 'power3.out',
        }),
      )
      const tiltY = tiltTargets.map((element) =>
        gsap.quickTo(element, 'rotationY', {
          duration: 0.4,
          ease: 'power3.out',
        }),
      )

      const onPointerMove = (event: PointerEvent) => {
        window.clearTimeout(clearTiltTimer)
        const bounds = section.getBoundingClientRect()
        const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5
        const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5
        tiltTargets.forEach((_element, index) => {
          if (tiltTargets[index]) {
            tiltTargets[index]!.style.willChange = 'transform'
          }
          const direction = sources[index]?.tilt ?? 1
          tiltX[index]?.(-normalizedY * 12 * direction)
          tiltY[index]?.(normalizedX * 12 * direction)
        })
      }

      const onPointerLeave = () => {
        tiltTargets.forEach((_element, index) => {
          tiltX[index]?.(baseTiltX[index] ?? 0)
          tiltY[index]?.(baseTiltY[index] ?? 0)
        })
        window.clearTimeout(clearTiltTimer)
        clearTiltTimer = window.setTimeout(() => {
          tiltTargets.forEach((element) => {
            element.style.willChange = ''
          })
        }, 450)
      }

      section.addEventListener('pointermove', onPointerMove)
      section.addEventListener('pointerleave', onPointerLeave)
      removePointerListeners = () => {
        section.removeEventListener('pointermove', onPointerMove)
        section.removeEventListener('pointerleave', onPointerLeave)
      }
    }, section)

    void document.fonts.ready.then(() => {
      if (!disposed) ScrollTrigger.refresh()
    })

    return () => {
      disposed = true
      removePointerListeners()
      window.clearTimeout(clearTiltTimer)
      ScrollTrigger.getAll()
        .filter((trigger) => trigger.trigger === section)
        .forEach((trigger) => trigger.kill(true))
      context.revert()
      section
        .querySelectorAll<HTMLElement>('.twin-source-card, .twin-source-card-inner')
        .forEach((element) => {
          element.style.willChange = ''
        })
      ScrollTrigger.refresh()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="twin-statement"
      aria-label="Connected business data"
      className="twin-scroll-statement relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#0A0B0D] px-5 text-white sm:px-8"
    >
      <div
        ref={greenRiseRef}
        aria-hidden="true"
        className="twin-green-rise pointer-events-none absolute inset-0 origin-bottom"
      />
      <div
        aria-hidden="true"
        className="twin-vignette pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.12)_48%,rgba(0,0,0,0.58)_100%)]"
      />
      <div
        ref={fadeRef}
        aria-hidden="true"
        className="twin-section-fade pointer-events-none absolute inset-x-0 bottom-0"
      />

      <div className="twin-source-field pointer-events-none absolute inset-0" style={{ perspective: '900px' }}>
        {sources.map((source, index) => {
          const Icon = source.icon
          return (
            <div
              key={source.name}
              className="twin-source-card absolute"
              data-parallax={source.parallax}
              data-tilt={source.tilt}
              style={source.position}
            >
              <div
                ref={(element) => {
                  cardInnerRefs.current[index] = element
                }}
                className="twin-source-card-inner"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[10px] font-medium text-white/55 sm:text-xs">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-[#86EFAC]">
                      <Icon aria-hidden="true" className="size-3.5" />
                    </span>
                    <span className="truncate">{source.name}</span>
                  </span>
                  <MiniChart type={source.chart} />
                </div>
                <p className="mt-4 text-xl font-medium tracking-[-0.06em] text-white sm:text-2xl">
                  {source.metric}
                </p>
                <p className="mt-0.5 text-[10px] text-white/40 sm:text-xs">
                  {source.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="twin-statement-copy relative z-10 w-full max-w-[880px] text-center">
        <h2 className="text-[clamp(1.9rem,5.1vw,4.35rem)] font-medium leading-[1.08] tracking-[-0.075em]">
          {statementLines.map((line, lineIndex) => (
            <span className="block" key={lineIndex}>
              {line.map((word, wordIndex) => {
                const isGreen = lineIndex === 2 && wordIndex < 2
                const isLast = lineIndex === 2 && wordIndex >= 2
                return (
                  <span
                    className={[
                      'twin-statement-word inline-block',
                      isGreen ? 'text-[#86EFAC]' : '',
                      isLast ? 'twin-last-word' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={`${lineIndex}-${wordIndex}`}
                  >
                    {word}
                    {wordIndex < line.length - 1 ? '\u00a0' : ''}
                  </span>
                )
              })}
            </span>
          ))}
        </h2>
      </div>

      <div className="twin-connected-mark pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
        <span className="twin-connected-logo grid size-[72px] place-items-center rounded-[22px] border border-[#86EFAC]/25 bg-[#0A0B0D]/85 shadow-[0_0_60px_rgba(34,197,94,0.2)] backdrop-blur-md">
          <svg
            viewBox="0 0 40 40"
            aria-hidden="true"
            className="size-9 text-[#86EFAC]"
            fill="none"
          >
            <circle cx="16" cy="20" r="9" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="24" cy="20" r="9" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </span>
        <p className="twin-connected-caption whitespace-nowrap text-xs font-medium tracking-[0.04em] text-white/80">
          One connected model
        </p>
      </div>
    </section>
  )
}
