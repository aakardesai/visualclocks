'use client'
import type { City } from '@/types'
import { formatTime, getUtcOffset, isDaytime } from '@/lib/time'
import AnalogClock from './AnalogClock'

interface ClockCardProps {
  city: City
  adjustedDate: Date
  onRemove: (id: string) => void
  clockType: 'analog' | 'digital'
  highlighted?: boolean
  isUtc?: boolean
}

export default function ClockCard({
  city,
  adjustedDate,
  onRemove,
  clockType,
  highlighted = false,
  isUtc = false,
}: ClockCardProps) {
  const daytime = isDaytime(adjustedDate, city.timezone)
  const time = formatTime(adjustedDate, city.timezone)
  const offset = getUtcOffset(adjustedDate, city.timezone)

  const bgColor = daytime ? '#F5F0E8' : '#1C1C2E'
  const textPrimary = daytime ? '#1A1A1A' : '#E8E8F0'
  const textMuted = daytime ? 'rgba(26,26,26,0.45)' : 'rgba(232,232,240,0.4)'
  const borderColor = highlighted
    ? '#C9A84C'
    : daytime
    ? 'rgba(26,26,26,0.1)'
    : 'rgba(232,232,240,0.08)'

  return (
    <div
      className="relative rounded-[12px] overflow-hidden transition-all duration-300 group"
      style={{
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        boxShadow: highlighted
          ? `0 0 0 2px #C9A84C40, 0 8px 32px rgba(201,168,76,0.18)`
          : daytime
          ? '0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)'
          : '0 4px 24px rgba(0,0,0,0.4)',
      }}
      id={`clock-${city.id}`}
    >
      {/* Remove button — hover reveal */}
      {!isUtc && (
        <button
          onClick={() => onRemove(city.id)}
          className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          style={{
            background: daytime ? 'rgba(26,26,26,0.1)' : 'rgba(232,232,240,0.1)',
            color: textMuted,
          }}
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

      <div className="p-4 flex flex-col items-center gap-3">
        {/* Clock face */}
        {clockType === 'analog' ? (
          <AnalogClock timezone={city.timezone} daytime={daytime} size={130} />
        ) : (
          <div
            className="flex items-center justify-center py-8 w-full"
            style={{ minHeight: 130 }}
          >
            <div
              className="font-mono text-[2rem] font-bold tabular-nums tracking-tight leading-none"
              style={{ color: textPrimary }}
            >
              {time}
            </div>
          </div>
        )}

        {/* City label */}
        <div className="text-center w-full px-1">
          <div
            className="font-semibold text-sm leading-tight truncate"
            style={{ color: textPrimary, fontFamily: 'inherit' }}
          >
            {city.name}
          </div>
          <div
            className="text-[11px] mt-0.5 tabular-nums"
            style={{ color: textMuted }}
          >
            {city.country ? `${city.country} · ` : ''}UTC{offset}
          </div>
        </div>

        {/* Day / Night badge */}
        <div
          className="flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase"
          style={{ color: textMuted }}
        >
          {daytime ? (
            <>
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color: '#C9A84C' }}
              >
                <circle cx="12" cy="12" r="5" />
                <path
                  stroke="currentColor"
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.22-6.78-1.42 1.42M6.64 17.36l-1.42 1.42M17.36 17.36l1.42 1.42M6.64 6.64 5.22 5.22"
                />
              </svg>
              <span style={{ color: '#C9A84C' }}>Day</span>
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color: '#7B8DB8' }}
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
              <span style={{ color: '#7B8DB8' }}>Night</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
