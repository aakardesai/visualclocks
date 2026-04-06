'use client'

import type { City } from '@/types'
import CityCard from './CityCard'

interface CityListProps {
  cities: City[]
  adjustedDate: Date
  onRemove: (id: string) => void
  isAnalog?: boolean
  highlightedId?: string | null
}

export default function CityList({
  cities,
  adjustedDate,
  onRemove,
  isAnalog = true,
  highlightedId = null,
}: CityListProps) {
  if (cities.length === 0) {
    return (
      <div className="px-4 py-5 text-center text-white/30 text-sm">
        Search for a city to add it
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/5">
      {cities.map((city) => (
        <CityCard
          key={city.id}
          city={city}
          adjustedDate={adjustedDate}
          onRemove={onRemove}
          isAnalog={isAnalog}
          isHighlighted={highlightedId === city.id}
        />
      ))}
    </div>
  )
}
