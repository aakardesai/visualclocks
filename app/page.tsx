'use client'
import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import dynamic from 'next/dynamic'
import type { City, SearchResult } from '@/types'
import { loadCities, saveCities } from '@/lib/storage'
import SearchBar from '@/components/SearchBar'
import CityCard from '@/components/CityCard'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const UTC_CITY: City = {
  id: 'utc',
  name: 'UTC',
  country: '',
  lat: 51.477,
  lng: 0,
  timezone: 'UTC',
}

export default function Page() {
  const [cities, setCities] = useState<City[]>([])
  const [initialized, setInitialized] = useState(false)
  const [isAnalog, setIsAnalog] = useState(true)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tick every second for day/night + UTC offset display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load analog/digital preference
  useEffect(() => {
    const saved = localStorage.getItem('visualclocks_mode')
    if (saved === 'digital') setIsAnalog(false)
  }, [])

  // Load pinned cities from localStorage and detect user location
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

  // Persist cities after init
  useEffect(() => {
    if (initialized) saveCities(cities)
  }, [cities, initialized])

  const toggleMode = useCallback(() => {
    setIsAnalog((prev) => {
      const next = !prev
      localStorage.setItem('visualclocks_mode', next ? 'analog' : 'digital')
      return next
    })
  }, [])

  const addCity = useCallback(async (lat: number, lng: number, name: string, country = '') => {
    try {
      const res = await fetch(`/api/timezone?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`)
      const { timezone } = await res.json()
      setCities((prev) => {
        if (prev.length >= 8) return prev
        const exists = prev.some(
          (c) => c.timezone === timezone && Math.abs(c.lat - lat) < 0.5
        )
        if (exists) return prev
        const city: City = {
          id: `city-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name,
          country,
          lat,
          lng,
          timezone,
        }
        return [...prev, city]
      })
    } catch {
      // Timezone lookup failed — skip
    }
  }, [])

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      addCity(result.lat, result.lng, result.name, result.country)
    },
    [addCity]
  )

  const handleRemove = useCallback((id: string) => {
    if (id === 'utc') return
    setCities((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const handleMarkerClick = useCallback((cityId: string) => {
    setHighlightedId(cityId)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3000)
  }, [])

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: '#0D0D14' }}>
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Wordmark */}
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-xl font-bold" style={{ color: '#C9A84C' }}>/</span>
          <span className="text-base font-semibold text-white">VisualClocks</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Analog / Digital toggle */}
          <button
            onClick={toggleMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
            aria-label="Toggle clock mode"
          >
            {isAnalog ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeWidth={1.5} d="M12 6v6l3 2" />
                </svg>
                <span className="hidden sm:inline">Analog</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeWidth={1.5} d="M7 12h2m2 0h2m2 0h2" />
                </svg>
                <span className="hidden sm:inline">Digital</span>
              </>
            )}
          </button>

          {/* Search / add city */}
          <SearchBar onSelect={handleSearchSelect} />
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Clock grid — top 55% */}
        <div
          className="overflow-y-auto"
          style={{ flex: '0 0 55%' }}
        >
          <div className="p-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {cities.map((city, i) => (
              <Fragment key={city.id}>
                {/* Ad rectangle after 4th card */}
                {i === 4 && (
                  <div
                    data-ad-slot="rectangle"
                    className="rounded-xl"
                    style={{ background: 'transparent' }}
                  />
                )}
                <CityCard
                  city={city}
                  adjustedDate={now}
                  onRemove={handleRemove}
                  isAnalog={isAnalog}
                  isHighlighted={highlightedId === city.id}
                />
              </Fragment>
            ))}
          </div>
        </div>

        {/* Ad leaderboard slot between grid and map */}
        <div
          data-ad-slot="leaderboard"
          className="w-full shrink-0"
          style={{ height: 0 }}
        />

        {/* Map — bottom 45% */}
        <div className="flex-1 min-h-0">
          <MapView
            pinnedCities={cities}
            adjustedDate={now}
            onMarkerClick={handleMarkerClick}
          />
        </div>
      </main>

      {/* Mobile banner ad — fixed bottom, invisible in prod */}
      <div
        data-ad-slot="mobile-banner"
        className="fixed bottom-0 left-0 right-0 pointer-events-none md:hidden"
        style={{ height: 0 }}
      />
    </div>
  )
}
