'use client'

import { useEffect, useState } from 'react'
import type { City } from '@/types'
import { formatTime, getUtcOffset, isDaytime } from '@/lib/time'

interface CityCardProps {
  city: City
  adjustedDate: Date
  onRemove: (id: string) => void
}

export default function CityCard({ city, adjustedDate, onRemove }: CityCardProps) {
  const [, tick] = useState(0)

  // Re-render every second to update time
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const time = formatTime(adjustedDate, city.timezone)
  const offset = getUtcOffset(adjustedDate, city.timezone)
  const daytime = isDaytime(adjustedDate, city.timezone)

  return (
    <div className="flex items-center gap-3 px-4 py-3 group relative">
      {/* Day/night indicator */}
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/8">
        {daytime ? (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              stroke="currentColor"
              fill="none"
              d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.22-6.78-1.42 1.42M6.64 17.36l-1.42 1.42M17.36 17.36l1.42 1.42M6.64 6.64 5.22 5.22"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </div>

      {/* City info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-white truncate">{city.name}</span>
          {city.country && (
            <span className="text-xs text-white/40 shrink-0">{city.country}</span>
          )}
        </div>
        <div className="text-xs text-white/35 mt-0.5">
          UTC{offset}
        </div>
      </div>

      {/* Time */}
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-semibold text-white tabular-nums tracking-tight">
          {time}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(city.id)}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/0 group-hover:text-white/50 hover:!text-white hover:bg-white/10 transition-all ml-1"
        aria-label={`Remove ${city.name}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
