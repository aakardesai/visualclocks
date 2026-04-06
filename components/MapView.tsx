'use client'
import { useEffect, useRef, useCallback } from 'react'
import type { City } from '@/types'
import { buildNightPolygon } from '@/lib/sun'

interface MapViewProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void
  pinnedCities: City[]
  adjustedDate: Date
}

export default function MapView({ onLocationSelect, pinnedCities, adjustedDate }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const popupRef = useRef<any>(null)

  const updateNightLayer = useCallback((map: any, date: Date) => {
    if (!map.getSource('night-overlay')) return
    const feature = buildNightPolygon(date)
    ;(map.getSource('night-overlay') as any).setData(feature)
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
        zoom: 1.8,
        minZoom: 1,
        maxZoom: 18,
        attributionControl: false,
      })

      mapRef.current = map

      // Disable rotation on mobile
      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      map.on('load', () => {
        // Night overlay layer
        map.addSource('night-overlay', {
          type: 'geojson',
          data: buildNightPolygon(adjustedDate),
        })
        map.addLayer({
          id: 'night-fill',
          type: 'fill',
          source: 'night-overlay',
          paint: {
            'fill-color': '#000014',
            'fill-opacity': 0.45,
          },
        })

        // Pinned city markers layer
        map.addSource('cities', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'city-dots',
          type: 'circle',
          source: 'cities',
          paint: {
            'circle-radius': 5,
            'circle-color': '#f97316',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        })

        map.resize()
      })

      // ResizeObserver to keep map sized correctly
      if (containerRef.current) {
        const observer = new ResizeObserver(() => {
          map.resize()
        })
        observer.observe(containerRef.current)
      }

      // Hover tooltip
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'map-tooltip',
        offset: 12,
      })
      popupRef.current = popup

      map.on('mousemove', async (e: any) => {
        const { lng, lat } = e.lngLat
        try {
          const res = await fetch(`/api/timezone?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`)
          const { timezone } = await res.json()
          const time = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(adjustedDate)
          const offset = getOffsetString(adjustedDate, timezone)
          const zone = timezone.replace('_', ' ').split('/').pop() ?? timezone
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="tooltip-content">
                <div class="tooltip-zone">${zone}</div>
                <div class="tooltip-time">${time}</div>
                <div class="tooltip-offset">UTC${offset}</div>
              </div>`
            )
            .addTo(map)
        } catch {
          popup.remove()
        }
      })

      map.on('mouseleave', () => popup.remove())

      map.on('click', async (e: any) => {
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

  // Update city markers
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
        properties: { name: city.name },
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
