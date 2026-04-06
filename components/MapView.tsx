'use client'
import { useEffect, useRef, useCallback } from 'react'
import type { City } from '@/types'
import { buildNightPolygon } from '@/lib/sun'

interface MapViewProps {
  pinnedCities: City[]
  adjustedDate: Date
  onMarkerClick: (cityId: string) => void
}

export default function MapView({ pinnedCities, adjustedDate, onMarkerClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const popupRef = useRef<any>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const pinnedCitiesRef = useRef(pinnedCities)

  useEffect(() => { onMarkerClickRef.current = onMarkerClick }, [onMarkerClick])
  useEffect(() => { pinnedCitiesRef.current = pinnedCities }, [pinnedCities])

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
        zoom: 1.5,
        minZoom: 1,
        maxZoom: 18,
        attributionControl: false,
      })

      mapRef.current = map

      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      map.on('load', () => {
        // Night overlay
        map.addSource('night-overlay', {
          type: 'geojson',
          data: buildNightPolygon(new Date()),
        })
        map.addLayer({
          id: 'night-fill',
          type: 'fill',
          source: 'night-overlay',
          paint: { 'fill-color': '#000014', 'fill-opacity': 0.4 },
        })

        // City markers source
        map.addSource('cities', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        // Glow ring
        map.addLayer({
          id: 'city-glow',
          type: 'circle',
          source: 'cities',
          paint: {
            'circle-radius': 16,
            'circle-color': '#C9A84C',
            'circle-opacity': 0.12,
            'circle-blur': 1,
          },
        })

        // Inner dot
        map.addLayer({
          id: 'city-dots',
          type: 'circle',
          source: 'cities',
          paint: {
            'circle-radius': 5,
            'circle-color': '#C9A84C',
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.75)',
          },
        })

        // Seed initial city data
        updateCitySource(map)

        map.resize()
      })

      // Keep map sized correctly on container resize
      if (containerRef.current) {
        const observer = new ResizeObserver(() => map.resize())
        observer.observe(containerRef.current)
      }

      // Cursor: pointer over city dots
      map.on('mouseenter', 'city-dots', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'city-dots', () => {
        map.getCanvas().style.cursor = ''
      })

      // City marker click → highlight card
      map.on('click', 'city-dots', (e: any) => {
        const cityId = e.features?.[0]?.properties?.id as string | undefined
        if (cityId) onMarkerClickRef.current(cityId)
        e.originalEvent?.stopPropagation()
      })

      // Hover tooltip (debounced, Nominatim + timezone)
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'map-tooltip',
        offset: 14,
      })
      popupRef.current = popup

      let hoverDebounce: ReturnType<typeof setTimeout> | null = null
      let pendingLng = 0
      let pendingLat = 0

      map.on('mousemove', (e: any) => {
        pendingLng = e.lngLat.lng
        pendingLat = e.lngLat.lat

        if (hoverDebounce) clearTimeout(hoverDebounce)
        hoverDebounce = setTimeout(async () => {
          const lat = pendingLat
          const lng = pendingLng
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
              'Unknown'

            const now = new Date()
            const time = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).format(now)
            const offset = getOffsetString(now, timezone)

            popup
              .setLngLat([lng, lat])
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
        }, 350)
      })

      map.on('mouseleave', () => {
        if (hoverDebounce) clearTimeout(hoverDebounce)
        popup.remove()
      })
    }

    init()

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateCitySource(map: any) {
    const source = map.getSource('cities') as any
    if (!source) return
    source.setData({
      type: 'FeatureCollection',
      features: pinnedCitiesRef.current.map((city) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [city.lng, city.lat] },
        properties: { id: city.id, name: city.name, timezone: city.timezone },
      })),
    })
  }

  // Update night overlay
  useEffect(() => {
    if (mapRef.current?.isStyleLoaded()) {
      updateNightLayer(mapRef.current, adjustedDate)
    }
  }, [adjustedDate, updateNightLayer])

  // Update city markers
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    updateCitySource(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedCities])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  )
}

function getOffsetString(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date)
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
    return offset.replace('GMT', '') || '+0'
  } catch {
    return '+0'
  }
}
