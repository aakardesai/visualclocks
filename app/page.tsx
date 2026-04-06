'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { City, SearchResult } from '@/types'
import { loadCities, saveCities } from '@/lib/storage'
import { getAdjustedDate } from '@/lib/time'
import SearchBar from '@/components/SearchBar'
import ClockCard from '@/components/ClockCard'
import AdSlot from '@/components/AdSlot'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const UTC_CITY: City = {
  id: 'utc',
  name: 'UTC',
  country: '',
  lat: 51.477,
  lng: 0,
  timezone: 'UTC',
}

const MAX_CITIES = 8

type ClockType = 'analog' | 'digital'

export default function Page() {
  const [cities, setCities] = useState<City[]>([])
  const [adjustedDate, setAdjustedDate] = useState(() => getAdjustedDate(0))
  const [initialized, setInitialized] = useState(false)
  const [clockType, setClockType] = useState<ClockType>('analog')
  const [highlightedCityId, setHighlightedCityId] = useState<string | null>(null)

  // 1-second tick
  useEffect(() => {
    const id = setInterval(() => setAdjustedDate(getAdjustedDate(0)), 1000)
    return () => clearInterval(id)
  }, [])

  // Load clock type preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vc_clock_type') as ClockType | null
    if (saved === 'analog' || saved === 'digital') setClockType(saved)
  }, [])

  // Load pinned cities
  useEffect(() => {
    const saved = loadCities()
    if (saved.length > 0) {
      setCities(saved)
      setInitialized(true)
      return
    }

    const defaults: City[] = [UTC_CITY]
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          try {
            const [tzRes, geoRes] = await Promise.all([
              fetch(`/api/timezone?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`),
              fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json`
              ),
            ])
            const { timezone } = await tzRes.json()
            const geoData = await geoRes.json()
            const name: string =
              geoData.address?.city ??
              geoData.address?.town ??
              geoData.address?.village ??
              geoData.address?.county ??
              'My Location'
            const country: string = geoData.address?.country_code?.toUpperCase() ?? ''
            const userCity: City = {
              id: `user-${Date.now()}`,
              name,
              country,
              lat,
              lng,
              timezone,
            }
            const initial = [userCity, UTC_CITY]
            setCities(initial)
            saveCities(initial)
          } catch {
            setCities(defaults)
            saveCities(defaults)
          }
          setInitialized(true)
        },
        () => {
          setCities(defaults)
          saveCities(defaults)
          setInitialized(true)
        },
        { timeout: 6000 }
      )
    } else {
      setCities(defaults)
      saveCities(defaults)
      setInitialized(true)
    }
  }, [])

  useEffect(() => {
    if (initialized) saveCities(cities)
  }, [cities, initialized])

  const addCity = useCallback(async (lat: number, lng: number, name: string, country = '') => {
    if (cities.length >= MAX_CITIES) return
    try {
      const res = await fetch(`/api/timezone?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`)
      const { timezone } = await res.json()
      const city: City = {
        id: `city-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        country,
        lat,
        lng,
        timezone,
      }
      setCities((prev) => {
        const exists = prev.some(
          (c) => c.timezone === timezone && Math.abs(c.lat - lat) < 0.5
        )
        if (exists) return prev
        if (prev.length >= MAX_CITIES) return prev
        return [...prev, city]
      })
    } catch {
      // Timezone lookup failed
    }
  }, [cities.length])

  const handleSearchSelect = useCallback(
    (result: SearchResult) => addCity(result.lat, result.lng, result.name, result.country),
    [addCity]
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number, placeName: string) => {
      const name = placeName.split(',')[0].trim()
      const country = placeName.split(',').slice(-1)[0].trim()
      addCity(lat, lng, name, country)
    },
    [addCity]
  )

  const handleRemove = useCallback((id: string) => {
    setCities((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const toggleClockType = useCallback(() => {
    setClockType((prev) => {
      const next = prev === 'analog' ? 'digital' : 'analog'
      localStorage.setItem('vc_clock_type', next)
      return next
    })
  }, [])

  const handleMarkerClick = useCallback((cityId: string) => {
    setHighlightedCityId(cityId)
    setTimeout(() => setHighlightedCityId(null), 2500)
  }, [])

  const atLimit = cities.length >= MAX_CITIES

  // Insert rectangle ad slot after position 5 (0-indexed) in the grid
  const AD_INSERT_AFTER = 5

  return (
    <div className="app-root flex flex-col bg-[#0D0D14] text-white">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 flex items-center px-5 gap-4 border-b border-white/[0.06] bg-[#0D0D14]/95 backdrop-blur-sm z-20">
        {/* Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[#C9A84C] font-bold text-lg leading-none">/</span>
          <span
            className="font-semibold text-white/90 text-sm tracking-wide hidden sm:block"
            style={{ letterSpacing: '0.04em' }}
          >
            VisualClocks
          </span>
        </div>

        {/* Search bar — centered */}
        <div className="flex-1 flex justify-center">
          <SearchBar onSelect={handleSearchSelect} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Clock type toggle */}
          <button
            onClick={toggleClockType}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/90"
            title="Toggle analog / digital"
          >
            {clockType === 'analog' ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeWidth={1.5} d="M12 7v5l3 3" />
                </svg>
                <span className="hidden sm:block">Analog</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeWidth={1.5} d="M8 12h2m4 0h2" />
                </svg>
                <span className="hidden sm:block">Digital</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="body-content flex flex-col flex-1 min-h-0">

        {/* Clocks section */}
        <div className="clocks-section overflow-y-auto px-4 md:px-6 py-5">
          {/* Limit notice */}
          {atLimit && (
            <p className="text-center text-xs text-[#C9A84C]/70 mb-3">
              Max {MAX_CITIES} cities — remove one to add another
            </p>
          )}

          {/* Clock grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {cities.map((city, i) => {
              const card = (
                <ClockCard
                  key={city.id}
                  city={city}
                  adjustedDate={adjustedDate}
                  onRemove={handleRemove}
                  clockType={clockType}
                  highlighted={highlightedCityId === city.id}
                  isUtc={city.id === 'utc'}
                />
              )

              // Insert rectangle ad slot after position AD_INSERT_AFTER
              if (i === AD_INSERT_AFTER) {
                return [
                  card,
                  <div key="ad-rect" className="flex items-center justify-center rounded-[12px]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <AdSlot type="rectangle" />
                  </div>,
                ]
              }
              return card
            })}
          </div>

          {/* Empty state */}
          {cities.length === 0 && initialized && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeWidth={1.5} d="M12 6v6l4 2" />
              </svg>
              <p className="text-sm">Search for a city or click the map to add it</p>
            </div>
          )}
        </div>

        {/* Leaderboard ad — between clocks and map */}
        <div className="shrink-0 flex justify-center items-center px-4 py-2">
          <AdSlot type="leaderboard" />
        </div>

        {/* Map section */}
        <div className="map-section relative shrink-0">
          <MapView
            onLocationSelect={handleMapClick}
            onCityMarkerClick={handleMarkerClick}
            pinnedCities={cities}
            adjustedDate={adjustedDate}
          />
        </div>
      </div>

      {/* Mobile banner — fixed bottom */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-center items-center"
        style={{
          background: '#0D0D14',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <AdSlot type="mobile-banner" />
      </div>
    </div>
  )
}
