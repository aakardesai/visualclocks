import SunCalc from 'suncalc'

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

/**
 * Build a GeoJSON polygon covering the night side of the Earth.
 * Uses SunCalc to get the sub-solar point, then generates the terminator
 * as the great circle 90° from the sun.
 */
export function buildNightPolygon(date: Date): GeoJSON.Feature<GeoJSON.Polygon> {
  // Find the sub-solar point by iterating to find where sun is at zenith
  // We use solar noon calculation across longitudes
  const subSolar = getSubSolarPoint(date)
  const sunLat = subSolar.lat * DEG
  const sunLng = subSolar.lng

  const terminator: [number, number][] = []

  for (let i = 0; i <= 360; i++) {
    const az = i * DEG
    // Point on the circle 90° from sub-solar point
    const sinLat =
      Math.sin(sunLat) * Math.cos(Math.PI / 2) +
      Math.cos(sunLat) * Math.sin(Math.PI / 2) * Math.cos(az)
    const lat = Math.asin(Math.max(-1, Math.min(1, sinLat))) * RAD
    const sinLat2 = Math.cos(sunLat) * Math.sqrt(1 - sinLat * sinLat)
    const dLon =
      sinLat2 === 0
        ? 0
        : Math.atan2(
            Math.sin(az) * Math.sin(Math.PI / 2) * Math.cos(sunLat),
            Math.cos(Math.PI / 2) - Math.sin(sunLat) * sinLat
          ) * RAD
    const lng = ((sunLng + dLon + 540) % 360) - 180
    terminator.push([lng, lat])
  }

  // Close by connecting through the night pole
  const nightPole = subSolar.lat >= 0 ? -90 : 90
  const coords: [number, number][] = [
    ...terminator,
    [terminator[terminator.length - 1][0], nightPole],
    [terminator[0][0], nightPole],
    terminator[0],
  ]

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  }
}

/**
 * Find the sub-solar point (where sun is directly overhead) for a given date.
 * Uses SunCalc's getPosition to scan and find max altitude.
 */
function getSubSolarPoint(date: Date): { lat: number; lng: number } {
  // The sub-solar latitude equals the sun's declination
  // Use SunCalc at known equator point to approximate declination
  let bestLng = 0
  let bestLat = 0
  let maxAlt = -Infinity

  // Scan longitudes at the equator to find sub-solar longitude
  for (let lng = -180; lng <= 180; lng += 5) {
    const pos = SunCalc.getPosition(date, 0, lng)
    if (pos.altitude > maxAlt) {
      maxAlt = pos.altitude
      bestLng = lng
    }
  }

  // Refine longitude
  for (let lng = bestLng - 6; lng <= bestLng + 6; lng += 1) {
    const pos = SunCalc.getPosition(date, 0, lng)
    if (pos.altitude > maxAlt) {
      maxAlt = pos.altitude
      bestLng = lng
    }
  }

  // Now find latitude with best altitude at this longitude
  maxAlt = -Infinity
  for (let lat = -90; lat <= 90; lat += 5) {
    const pos = SunCalc.getPosition(date, lat, bestLng)
    if (pos.altitude > maxAlt) {
      maxAlt = pos.altitude
      bestLat = lat
    }
  }
  for (let lat = bestLat - 6; lat <= bestLat + 6; lat += 1) {
    const pos = SunCalc.getPosition(date, lat, bestLng)
    if (pos.altitude > maxAlt) {
      maxAlt = pos.altitude
      bestLat = lat
    }
  }

  return { lat: bestLat, lng: bestLng }
}
