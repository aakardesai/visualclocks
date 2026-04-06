'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { City, SearchResult } from '@/types'
import { loadCities, saveCities } from '@/lib/storage'
import { getAdjustedDate } from '@/lib/time'
import SearchBar from '@/components/SearchBar'
import CityList from '@/components/CityList'
import TimeScrubber from '@/components/TimeScrubber'

// MapLibre GL JS requires browser APIs — must be dynamically imported
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
  const [offsetMinutes, setOffsetMinutes] = useState(0)
  const [adjustedDate, setAdjustedDate] = useState(() => getAdjustedDate(0))
  const [initialized, setInitialized] = useState(false)

  // Keep adjustedDate in sync with offset + real time
  useEffect(() => {
    const tick = () => setAdjustedDate(getAdjustedDate(offsetMinutes))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [offsetMinutes])

  // Load pinned cities from localStorage and detect user location
  useEffect(() => {
    const saved = loadCities()
    if (saved.length > 0) {
      setCities(saved)
      setInitialized(true)
      return
    }

    // Default: UTC + user location
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
            const country: string =
              geoData.address?.country_code?.toUpperCase() ?? ''
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
          // No permission — just use UTC
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

  // Persist to localStorage whenever cities change (after init)
  useEffect(() => {
    if (initialized) saveCities(cities)
  }, [cities, initialized])

  const addCity = useCallback(
    async (lat: number, lng: number, name: string, country = '') => {
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
          // Avoid duplicates by timezone + rough location
          const exists = prev.some(
            (c) => c.timezone === timezone && Math.abs(c.lat - lat) < 0.5
          )
          if (exists) return prev
          return [...prev, city]
        })
      } catch {
        // Timezone lookup failed — skip adding
      }
    },
    []
  )

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      addCity(result.lat, result.lng, result.name, result.country)
    },
    [addCity]
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number, placeName: string) => {
      // Extract city name from place_name (first part before comma)
      const name = placeName.split(',')[0].trim()
      const country = placeName.split(',').slice(-1)[0].trim()
      addCity(lat, lng, name, country)
    },
    [addCity]
  )

  const handleRemove = useCallback((id: string) => {
    setCities((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return (
    <div
      className="relative w-screen overflow-hidden bg-[#0a0f1e]"
      style={{ height: '100dvh' }}
    >
      {/* Full-screen map */}
      <MapView
        onLocationSelect={handleMapClick}
        pinnedCities={cities}
        adjustedDate={adjustedDate}
      />

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-3 pointer-events-none">
        {/* Logo */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeWidth={1.5} d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/80 hidden sm:block">VisualClocks</span>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-center pointer-events-auto">
          <SearchBar onSelect={handleSearchSelect} />
        </div>

        {/* Spacer to balance logo */}
        <div className="w-8 sm:w-[110px]" />
      </header>

      {/* Bottom city panel — fixed overlay, does not affect map layout */}
      <aside className="fixed bottom-0 left-0 right-0 z-10 flex justify-center pb-4 px-4 pointer-events-none">
        <div
          className="w-full max-w-md bg-[#0d1526]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
          style={{ maxHeight: 'calc(100dvh - 120px)' }}
        >
          {/* Panel header */}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Pinned Cities
            </span>
            {cities.length > 0 && (
              <span className="text-xs text-white/25">{cities.length}</span>
            )}
          </div>

          {/* Scrollable city list */}
          <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
            <CityList
              cities={cities}
              adjustedDate={adjustedDate}
              onRemove={handleRemove}
            />
          </div>

          {/* Time scrubber */}
          <TimeScrubber offsetMinutes={offsetMinutes} onChange={setOffsetMinutes} />
        </div>
      </aside>
    </div>
  )
}
