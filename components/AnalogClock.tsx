'use client'
import { useEffect, useRef } from 'react'

interface AnalogClockProps {
  timezone: string
  daytime: boolean
  size?: number
}

function getTimeParts(timezone: string): { h: number; m: number; s: number; ms: number } {
  const now = new Date()
  const ms = now.getMilliseconds()
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now)
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0')
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0')
    const s = parseInt(parts.find((p) => p.type === 'second')?.value ?? '0')
    return { h, m, s, ms }
  } catch {
    return { h: 0, m: 0, s: 0, ms }
  }
}

export default function AnalogClock({ timezone, daytime, size = 140 }: AnalogClockProps) {
  const secRef = useRef<SVGGElement>(null)
  const minRef = useRef<SVGGElement>(null)
  const hrRef = useRef<SVGGElement>(null)
  const rafRef = useRef<number>(0)

  const cx = size / 2
  const cy = size / 2
  const r = size / 2

  useEffect(() => {
    const tick = () => {
      const { h, m, s, ms } = getTimeParts(timezone)
      const secDeg = (s + ms / 1000) * 6
      const minDeg = (m + s / 60) * 6
      const hourDeg = ((h % 12) + m / 60) * 30

      secRef.current?.setAttribute('transform', `rotate(${secDeg}, ${cx}, ${cy})`)
      minRef.current?.setAttribute('transform', `rotate(${minDeg}, ${cx}, ${cy})`)
      hrRef.current?.setAttribute('transform', `rotate(${hourDeg}, ${cx}, ${cy})`)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [timezone, cx, cy])

  // Color scheme based on day/night
  const faceColor = daytime ? '#F5F0E8' : '#1C1C2E'
  const handColor = daytime ? '#1A1A1A' : '#E8E8F0'
  const bezelColor = daytime ? 'rgba(26,26,26,0.12)' : 'rgba(232,232,240,0.1)'
  const accentColor = '#C9A84C'

  // Hour markers — 12 positions
  const markers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180
    const markerR = r * 0.82
    return {
      x: cx + markerR * Math.sin(angle),
      y: cy - markerR * Math.cos(angle),
      major: i % 3 === 0,
    }
  })

  const hrLength = r * 0.52
  const minLength = r * 0.68
  const secLength = r * 0.73
  const secTail = r * 0.2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="Analog clock"
    >
      {/* Face */}
      <circle
        cx={cx}
        cy={cy}
        r={r - 1.5}
        fill={faceColor}
        stroke={bezelColor}
        strokeWidth={1.5}
      />

      {/* Subtle inner ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r - 6}
        fill="none"
        stroke={bezelColor}
        strokeWidth={0.5}
      />

      {/* Hour markers */}
      {markers.map((mk, i) => (
        <circle
          key={i}
          cx={mk.x}
          cy={mk.y}
          r={mk.major ? 2 : 1.2}
          fill={handColor}
          opacity={mk.major ? 0.45 : 0.2}
        />
      ))}

      {/* Hour hand */}
      <g ref={hrRef}>
        <line
          x1={cx}
          y1={cy + hrLength * 0.18}
          x2={cx}
          y2={cy - hrLength}
          stroke={handColor}
          strokeWidth={3.5}
          strokeLinecap="round"
          opacity={0.88}
        />
      </g>

      {/* Minute hand */}
      <g ref={minRef}>
        <line
          x1={cx}
          y1={cy + minLength * 0.12}
          x2={cx}
          y2={cy - minLength}
          stroke={handColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.85}
        />
      </g>

      {/* Second hand */}
      <g ref={secRef}>
        {/* Tail */}
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy + secTail}
          stroke={accentColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Main sweep */}
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - secLength}
          stroke={accentColor}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        {/* Accent dot near center */}
        <circle cx={cx} cy={cy + secTail * 0.6} r={2.5} fill={accentColor} />
      </g>

      {/* Center cap */}
      <circle cx={cx} cy={cy} r={3} fill={handColor} opacity={0.75} />
      <circle cx={cx} cy={cy} r={1.5} fill={accentColor} />
    </svg>
  )
}
