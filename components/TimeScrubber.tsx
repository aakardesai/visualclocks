'use client'

import { useCallback } from 'react'

interface TimeScrubberProps {
  offsetMinutes: number
  onChange: (minutes: number) => void
}

const MIN = -720  // -12h
const MAX = 720   // +12h

export default function TimeScrubber({ offsetMinutes, onChange }: TimeScrubberProps) {
  const hours = offsetMinutes / 60
  const pct = ((offsetMinutes - MIN) / (MAX - MIN)) * 100

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value, 10))
    },
    [onChange]
  )

  const reset = () => onChange(0)

  const label =
    offsetMinutes === 0
      ? 'Now'
      : `${hours >= 0 ? '+' : ''}${hours.toFixed(1)}h`

  return (
    <div className="px-4 py-3 border-t border-white/8">
      <div className="flex items-center gap-3">
        {/* Label */}
        <button
          onClick={reset}
          className="text-xs font-mono w-14 shrink-0 text-right text-white/60 hover:text-orange-400 transition-colors"
          title="Reset to now"
        >
          {label}
        </button>

        {/* Track */}
        <div className="relative flex-1 h-5 flex items-center">
          {/* Center line */}
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-px h-2.5 bg-white/20" />

          <input
            type="range"
            min={MIN}
            max={MAX}
            step={15}
            value={offsetMinutes}
            onChange={handleChange}
            className="scrubber w-full"
            aria-label="Time offset"
          />
        </div>

        {/* Clock icon */}
        <div className="w-14 shrink-0 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeWidth={1.5} d="M12 6v6l4 2" />
          </svg>
          <span className="text-xs text-white/30">scrub</span>
        </div>
      </div>
    </div>
  )
}
