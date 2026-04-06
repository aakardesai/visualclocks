import { find } from 'geo-tz'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const timezones = find(lat, lng)
  const timezone = timezones[0] ?? 'UTC'

  return NextResponse.json({ timezone })
}
