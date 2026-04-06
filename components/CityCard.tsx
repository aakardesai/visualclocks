'use client'

import { useEffect, useRef } from 'react'
import type { City } from '@/types'
import { getUtcOffset, isDaytime } from '@/lib/time'

interface CityCardProps {
  city: City
  adjustedDate: Date
  onRemove: (id: string) => void
  isAnalog: boolean
  isHighlighted: boolean
}

function AnalogClock({ timezone, daytime }: { timezone: string; daytime: boolean }) {
  const hourRef = useRef<SVGLineElement>(null)
  const minRef = useRef<SVGLineElement>(null)
  const secRef = useRef<SVGLineElement>(null)

  const dialBg = daytime ? '#F5F0E8' : '#1C1C2E'
  const handColor = daytime ? '#1A1A1A' : '#E8E8F0'
  const markerColor = daytime ? 'rgba(26,26,26,0.35)' : 'rgba(232,232,240,0.35)'

  useEffect(() => {
    const hourEl = hourRef.current
    const minEl = minRef.current
    const secEl = secRef.current
    if (!hourEl || !minEl || !secEl) return

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    })

    let raf: number
    const update = () => {
      const now = new Date()
      const parts = fmt.formatToParts(now)
      const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
      const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
      const s = parseInt(parts.find((p) => p.type === 'second')?.value ?? '0', 10)
      const ms = now.getMilliseconds()

      const sFrac = s + ms / 1000
      const mFrac = m + sFrac / 60
      const hFrac = (h % 12) + mFrac / 60

      hourEl.setAttribute('transform', `rotate(${hFrac * 30}, 50, 50)`)
      minEl.setAttribute('transform', `rotate(${mFrac * 6}, 50, 50)`)
      secEl.setAttribute('transform', `rotate(${sFrac * 6}, 50, 50)`)

      raf = requestAnimationFrame(update)
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [timezone])

  // 12 hour-marker dots
  const dots = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180)
    const r = 40
    return {
      x: 50 + r * Math.cos(angle),
      y: 50 + r * Math.sin(angle),
      isMain: i % 3 === 0,
    }
  })

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Dial */}
      <circle cx="50" cy="50" r="49" fill={dialBg} />
      <circle cx="50" cy="50" r="49" fill="none" stroke={markerColor} strokeWidth="0.5" />

      {/* Hour dots */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.isMain ? 2.5 : 1.2} fill={markerColor} />
      ))}

      {/* Hour hand */}
      <line
        ref={hourRef}
        x1="50"
        y1="50"
        x2="50"
        y2="24"
        stroke={handColor}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        ref={minRef}
        x1="50"
        y1="50"
        x2="50"
        y2="15"
        stroke={handColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Second hand (amber, extends behind center) */}
      <line
        ref={secRef}
        x1="50"
        y1="58"
        x2="50"
        y2="11"
        stroke="#C9A84C"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Center cap */}
      <circle cx="50" cy="50" r="3.5" fill={handColor} />
      <circle cx="50" cy="50" r="1.8" fill="#C9A84C" />
    </svg>
  )
}

function DigitalClock({ timezone, daytime }: { timezone: string; daytime: boolean }) {
  const timeRef = useRef<HTMLDivElement>(null)

  const dialBg = daytime ? '#F5F0E8' : '#1C1C2E'
  const textColor = daytime ? '#1A1A1A' : '#E8E8F0'

  useEffect(() => {
    const el = timeRef.current
    if (!el) return

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    let raf: number
    const update = () => {
      el.textContent = fmt.format(new Date())
      raf = requestAnimationFrame(update)
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [timezone])

  return (
    <div
      className="w-full h-full flex items-center justify-center rounded-xl"
      style={{ background: dialBg }}
    >
      <div
        ref={timeRef}
        className="font-mono font-bold tabular-nums tracking-tight"
        style={{ color: textColor, fontSize: 'clamp(13px, 3.5vw, 20px)' }}
      />
    </div>
  )
}

export default function CityCard({
  city,
  adjustedDate,
  onRemove,
  isAnalog,
  isHighlighted,
}: CityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const offset = getUtcOffset(adjustedDate, city.timezone)
  const daytime = isDaytime(adjustedDate, city.timezone)

  // Scroll into view when highlighted via map marker click
  useEffect(() => {
    if (isHighlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isHighlighted])

  return (
    <div
      ref={cardRef}
      id={`card-${city.id}`}
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-300"
      style={{
        background: '#12121F',
        boxShadow: isHighlighted
          ? '0 0 0 2px #C9A84C, 0 0 24px rgba(201,168,76,0.25)'
          : '0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate leading-tight">
            {city.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {city.country && (
              <span className="text-xs text-white/40">{city.country}</span>
            )}
            <span className="text-xs" style={{ color: '#C9A84C' }}>
              UTC{offset}
            </span>
          </div>
        </div>
        {city.id !== 'utc' && (
          <button
            onClick={() => onRemove(city.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white/25 hover:text-white hover:bg-white/10 transition-all"
            aria-label={`Remove ${city.name}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Clock face */}
      <div className="w-full aspect-square max-w-[144px] mx-auto">
        {isAnalog ? (
          <AnalogClock timezone={city.timezone} daytime={daytime} />
        ) : (
          <DigitalClock timezone={city.timezone} daytime={daytime} />
        )}
      </div>
    </div>
  )
}
