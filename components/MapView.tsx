'use client'
import { useEffect, useRef, useCallback } from 'react'
import type { City } from '@/types'
import { buildNightPolygon } from '@/lib/sun'
import { formatTimeShort, getUtcOffset } from '@/lib/time'

interface MapViewProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void
  onCityMarkerClick?: (cityId: string) => void
  pinnedCities: City[]
  adjustedDate: Date
}

export default function MapView({
  onLocationSelect,
  onCityMarkerClick,
  pinnedCities,
  adjustedDate,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const popupRef = useRef<any>(null)
  // Always-current ref so event handlers don't stale-close over adjustedDate
  const adjustedDateRef = useRef(adjustedDate)
  const citiesRef = useRef(pinnedCities)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCityMarkerClickRef = useRef(onCityMarkerClick)

  // Keep refs current
  useEffect(() => { adjustedDateRef.current = adjustedDate }, [adjustedDate])
  useEffect(() => { citiesRef.current = pinnedCities }, [pinnedCities])
  useEffect(() => { onCityMarkerClickRef.current = onCityMarkerClick }, [onCityMarkerClick])

  const updateNightLayer = useCallback((map: any, date: Date) => {
    if (!map.getSource('night-overlay')) return
    ;(map.getSource('night-overlay') as any).setData(buildNightPolygon(date))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!containerRef.current || mapRef.current) return

    let map: any

    const init = async () => {
      const maplibregl = (await import('maplibre-gl')).default

      map = new maplibregl.Map({
        container: containerRef.current!,
        style: {
          version: 8,
          sources: {
            'carto-dark': {
              type: 'raster',
              tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors, © CARTO',
            },
          },
          layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
        },
        center: [0, 20],
        zoom: 1.4,
        minZoom: 1,
        maxZoom: 18,
        attributionControl: false,
      })

      mapRef.current = map

      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      // Hover tooltip popup
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'map-tooltip',
        offset: 14,
        maxWidth: '240px',
      })
      popupRef.current = popup

      map.on('load', () => {
        // Night overlay
        map.addSource('night-overlay', {
          type: 'geojson',
          data: buildNightPolygon(adjustedDateRef.current),
        })
        map.addLayer({
          id: 'night-fill',
          type: 'fill',
          source: 'night-overlay',
          paint: { 'fill-color': '#000014', 'fill-opacity': 0.45 },
        })

        // City markers — two layers (glow + dot)
        map.addSource('cities', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        // Outer glow
        map.addLayer({
          id: 'city-glow',
          type: 'circle',
          source: 'cities',
          paint: {
            'circle-radius': 14,
            'circle-color': '#C9A84C',
            'circle-opacity': 0.18,
            'circle-blur': 1,
          },
        })
        // Main dot
        map.addLayer({
          id: 'city-dots',
          type: 'circle',
          source: 'cities',
          paint: {
            'circle-radius': 5,
            'circle-color': '#C9A84C',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.85)',
            'circle-opacity': 1,
          },
        })

        map.resize()
      })

      // ResizeObserver
      if (containerRef.current) {
        const observer = new ResizeObserver(() => map.resize())
        observer.observe(containerRef.current)
      }

      // Debounced hover tooltip
      map.on('mousemove', (e: any) => {
        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
        tooltipTimerRef.current = setTimeout(async () => {
          const { lng, lat } = e.lngLat
          try {
            const [tzRes, geoRes] = await Promise.all([
              fetch(`/api/timezone?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`),
              fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json`
              ),
            ])
            const { timezone } = await tzRes.json()
            const geoData = await geoRes.json()

            const cityName: string =
              geoData.address?.city ??
              geoData.address?.town ??
              geoData.address?.village ??
              geoData.address?.county ??
              geoData.display_name?.split(',')[0] ??
              `${lat.toFixed(2)}, ${lng.toFixed(2)}`

            const date = adjustedDateRef.current
            const time = formatTimeShort(date, timezone)
            const offset = getUtcOffset(date, timezone)

            popup
              .setLngLat(e.lngLat)
              .setHTML(
                `<div class="tooltip-content">
                  <div class="tooltip-city">${cityName}</div>
                  <div class="tooltip-time">${time}</div>
                  <div class="tooltip-offset">UTC${offset}</div>
                </div>`
              )
              .addTo(map)
          } catch {
            popup.remove()
          }
        }, 220)
      })

      map.on('mouseleave', () => {
        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
        popup.remove()
      })

      // Click on city marker → highlight card
      map.on('click', 'city-dots', (e: any) => {
        e.preventDefault()
        const feature = e.features?.[0]
        if (!feature) return
        const cityId = feature.properties?.id as string | undefined
        if (cityId) {
          onCityMarkerClickRef.current?.(cityId)
          // Scroll to card
          const el = document.getElementById(`clock-${cityId}`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })

      map.on('mouseenter', 'city-dots', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'city-dots', () => {
        map.getCanvas().style.cursor = ''
      })

      // Click elsewhere on map → reverse geocode + add city
      map.on('click', async (e: any) => {
        // If the click was on a city dot, don't add a new city
        const features = map.queryRenderedFeatures(e.point, { layers: ['city-dots'] })
        if (features.length > 0) return

        const { lng, lat } = e.lngLat
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json`
          )
          const geoData = await geoRes.json()
          const cityName: string =
            geoData.address?.city ??
            geoData.address?.town ??
            geoData.address?.village ??
            geoData.address?.county ??
            geoData.display_name?.split(',')[0] ??
            `${lat.toFixed(2)}, ${lng.toFixed(2)}`
          onLocationSelect(lat, lng, cityName)
        } catch {
          onLocationSelect(lat, lng, `${lat.toFixed(2)}, ${lng.toFixed(2)}`)
        }
      })
    }

    init()

    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update night overlay when date changes
  useEffect(() => {
    if (mapRef.current?.isStyleLoaded()) {
      updateNightLayer(mapRef.current, adjustedDate)
    }
  }, [adjustedDate, updateNightLayer])

  // Update city markers (include id in properties for click handler)
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('cities') as any
    if (!source) return
    source.setData({
      type: 'FeatureCollection',
      features: pinnedCities.map((city) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [city.lng, city.lat] },
        properties: { id: city.id, name: city.name },
      })),
    })
  }, [pinnedCities])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  )
}
