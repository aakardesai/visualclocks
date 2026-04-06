'use client'
import { useState, useRef, useCallback } from 'react'
import type { SearchResult } from '@/types'

interface SearchBarProps {
  onSelect: (result: SearchResult) => void
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
      )
      const data = await res.json()
      const parsed: SearchResult[] = (data ?? []).map((f: any) => {
        const lat = parseFloat(f.lat)
        const lng = parseFloat(f.lon)
        const cityName: string =
          f.address?.city ??
          f.address?.town ??
          f.address?.village ??
          f.address?.county ??
          f.display_name.split(',')[0]
        const country = f.address?.country_code?.toUpperCase() ?? ''
        return {
          id: f.place_id?.toString() ?? `${lat}-${lng}`,
          name: cityName,
          country,
          lat,
          lng,
          placeName: f.display_name,
        }
      })
      setResults(parsed)
      setIsOpen(parsed.length > 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (result: SearchResult) => {
    onSelect(result)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search city..."
          className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/40 outline-none focus:border-white/30 focus:bg-white/15 transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
          {results.map((r) => (
            <button
              key={r.id}
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center gap-3 group"
            >
              <svg
                className="w-4 h-4 text-orange-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">{r.name}</div>
                <div className="text-xs text-white/40 truncate">{r.placeName}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
