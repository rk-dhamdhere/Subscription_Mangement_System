'use client'

import { useEffect, useRef } from 'react'

type Dot = {
  x: number
  y: number
  depth: number
  size: number
  revealDelay: number
  offsetX: number
  offsetY: number
  velocityX: number
  velocityY: number
  scale: number
  scaleVelocity: number
}

type DotFloorProps = {
  pulseKey: number
}

const DESKTOP_DOT_ROWS = 42
const MOBILE_DOT_ROWS = 21
const HORIZON_RATIO = 0.38
const POINTER_RADIUS = 200
const SPRING_STIFFNESS = 120
const SPRING_DAMPING = 14
const FRAME_INTERVAL = 1000 / 60
const REVEAL_DURATION = 900
const RIPPLE_DURATION = 1.8
const RIPPLE_SPEED = 460

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export default function DotFloor({ pulseKey }: DotFloorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pulseKeyRef = useRef(pulseKey)

  useEffect(() => {
    pulseKeyRef.current = pulseKey
  }, [pulseKey])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let width = 0
    let height = 0
    let pixelRatio = 1
    let dots: Dot[] = []
    let animationFrame = 0
    let lastFrameTime = 0
    let startTime = performance.now()
    let lastPulseKey = pulseKeyRef.current
    let ripple: { x: number; y: number; startedAt: number } | null = null
    let pointer: { x: number; y: number } | null = null
    let visible = false
    let reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const buildDots = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

      const horizon = height * HORIZON_RATIO
      const nextDots: Dot[] = []
      const rowCount =
        window.matchMedia('(max-width: 767px)').matches
          ? MOBILE_DOT_ROWS
          : DESKTOP_DOT_ROWS
      for (let row = 0; row < rowCount; row += 1) {
        const depth = row / (rowCount - 1)
        const y = horizon + Math.pow(depth, 1.62) * (height - horizon)
        const spacing = 11 + depth * 20
        const columnCount = Math.ceil(width / spacing) + 2
        const startX = (width - (columnCount - 1) * spacing) / 2

        for (let column = 0; column < columnCount; column += 1) {
          nextDots.push({
            x: startX + column * spacing,
            y,
            depth,
            size: 0.55 + depth * 4.7,
            revealDelay: depth * (REVEAL_DURATION - 250),
            offsetX: 0,
            offsetY: 0,
            velocityX: 0,
            velocityY: 0,
            scale: 1,
            scaleVelocity: 0,
          })
        }
      }

      dots = nextDots
      if (reducedMotion) draw(performance.now(), true)
    }

    const draw = (time: number, staticFrame = false) => {
      context.clearRect(0, 0, width, height)
      const elapsed = time - startTime
      const dt = Math.min((time - (lastFrameTime || time)) / 1000, 0.04)
      const rippleAge = ripple ? (time - ripple.startedAt) / 1000 : 0
      const rippleActive = ripple !== null && rippleAge < RIPPLE_DURATION
      if (!rippleActive) ripple = null

      for (const dot of dots) {
        const reveal = reducedMotion
          ? 1
          : clamp((elapsed - dot.revealDelay) / 250, 0, 1)
        if (reveal <= 0) continue

        let targetX = 0
        let targetY = 0
        let targetScale = 1
        let pointerStrength = 0
        if (!reducedMotion && pointer) {
          const dx = dot.x - pointer.x
          const dy = dot.y - pointer.y
          const distance = Math.hypot(dx, dy)
          pointerStrength = clamp(1 - distance / POINTER_RADIUS, 0, 1)
          const falloff = pointerStrength * pointerStrength
          if (distance > 0) {
            targetX = (dx / distance) * falloff * 12
            targetY = (dy / distance) * falloff * 12
          }
          targetScale += falloff * 0.9
        }

        let rippleStrength = 0
        if (rippleActive && ripple) {
          const distance = Math.hypot(dot.x - ripple.x, dot.y - ripple.y)
          const ringRadius = rippleAge * RIPPLE_SPEED
          const ringDistance = Math.abs(distance - ringRadius)
          rippleStrength =
            Math.exp(-(ringDistance * ringDistance) / (2 * 26 * 26)) *
            (1 - rippleAge / RIPPLE_DURATION)
          if (distance > 0) {
            targetX += ((dot.x - ripple.x) / distance) * rippleStrength * 10
            targetY += ((dot.y - ripple.y) / distance) * rippleStrength * 10
          }
        }

        const springIsMoving =
          Math.abs(dot.offsetX) > 0.005 ||
          Math.abs(dot.offsetY) > 0.005 ||
          Math.abs(dot.velocityX) > 0.005 ||
          Math.abs(dot.velocityY) > 0.005 ||
          Math.abs(dot.scale - 1) > 0.001 ||
          Math.abs(dot.scaleVelocity) > 0.001
        if (!reducedMotion && (pointer || rippleActive || springIsMoving)) {
          const accelerationX =
            (targetX - dot.offsetX) * SPRING_STIFFNESS -
            dot.velocityX * SPRING_DAMPING
          const accelerationY =
            (targetY - dot.offsetY) * SPRING_STIFFNESS -
            dot.velocityY * SPRING_DAMPING
          const accelerationScale =
            (targetScale - dot.scale) * SPRING_STIFFNESS -
            dot.scaleVelocity * SPRING_DAMPING
          dot.velocityX += accelerationX * dt
          dot.velocityY += accelerationY * dt
          dot.scaleVelocity += accelerationScale * dt
          dot.offsetX += dot.velocityX * dt
          dot.offsetY += dot.velocityY * dt
          dot.scale += dot.scaleVelocity * dt
        }

        const idleWave = reducedMotion
          ? 0
          : (Math.sin(
              ((dot.x + dot.y * 1.4) / 260) -
                (time / 6000) * Math.PI * 2,
            ) +
              1) /
            2
        const brightness = Math.max(pointerStrength, rippleStrength)
        const opacity =
          reveal *
          (0.07 + dot.depth * 0.5 + idleWave * (reducedMotion ? 0 : 0.1)) *
          (1 + brightness * 1.4)
        const size = dot.size * dot.scale
        const drawX = dot.x + dot.offsetX
        const drawY = dot.y + dot.offsetY

        context.globalAlpha = Math.min(opacity, 0.95)
        context.fillStyle = brightness > 0.08 ? '#22C55E' : '#567064'
        if (dot.depth > 0.48) {
          context.fillRect(
            drawX - size / 2,
            drawY - size / 2,
            size,
            size,
          )
        } else {
          context.beginPath()
          context.arc(drawX, drawY, size / 2, 0, Math.PI * 2)
          context.fill()
        }
      }
      context.globalAlpha = 1
      lastFrameTime = time
      if (staticFrame) return
    }

    const renderFrame = (time: number) => {
      animationFrame = 0
      if (!visible || document.hidden) return
      if (time - lastFrameTime < FRAME_INTERVAL) {
        animationFrame = window.requestAnimationFrame(renderFrame)
        return
      }

      if (pulseKeyRef.current !== lastPulseKey) {
        lastPulseKey = pulseKeyRef.current
        ripple = {
          x: width / 2,
          y: height * 0.56,
          startedAt: time,
        }
      }

      draw(time)
      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(renderFrame)
      }
    }

    const scheduleFrame = () => {
      if (visible && !animationFrame) {
        animationFrame = window.requestAnimationFrame(renderFrame)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion) return
      const bounds = canvas.getBoundingClientRect()
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      scheduleFrame()
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame)
        animationFrame = 0
      } else {
        lastFrameTime = 0
        scheduleFrame()
      }
    }

    const onPointerLeave = () => {
      pointer = null
      scheduleFrame()
    }

    const onClick = (event: MouseEvent) => {
      if (reducedMotion) return
      const bounds = canvas.getBoundingClientRect()
      ripple = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        startedAt: performance.now(),
      }
      scheduleFrame()
    }

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
      startTime = performance.now() - REVEAL_DURATION
      if (reducedMotion) {
        pointer = null
        ripple = null
        if (animationFrame) window.cancelAnimationFrame(animationFrame)
        animationFrame = 0
        draw(performance.now(), true)
      } else {
        lastFrameTime = 0
        scheduleFrame()
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) {
        scheduleFrame()
      } else if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
        animationFrame = 0
      }
    })

    const resizeObserver = new ResizeObserver(buildDots)
    resizeObserver.observe(canvas)
    observer.observe(canvas)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('click', onClick)
    document.addEventListener('visibilitychange', onVisibilityChange)
    motionPreference.addEventListener('change', onMotionPreferenceChange)

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      resizeObserver.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      motionPreference.removeEventListener('change', onMotionPreferenceChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="twin-dot-floor pointer-events-auto absolute inset-0 size-full"
    />
  )
}
