/**
 * Format a Date in a given IANA timezone to "HH:MM:SS" format (24hr).
 */
export function formatTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return '--:--:--'
  }
}

/**
 * Format a Date in a given timezone for display (no seconds).
 */
export function formatTimeShort(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return '--:--'
  }
}

/**
 * Get UTC offset string like "+5:30" or "-8:00" for a timezone.
 */
export function getUtcOffset(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(date)
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC'
    // Convert "GMT+5:30" → "+5:30"
    return offset.replace('GMT', '') || '+0'
  } catch {
    return '+0'
  }
}

/**
 * Get the effective date adjusted by a scrubber offset in minutes.
 */
export function getAdjustedDate(offsetMinutes: number): Date {
  const now = new Date()
  return new Date(now.getTime() + offsetMinutes * 60 * 1000)
}

/**
 * Check if it's daytime at a given timezone.
 */
export function isDaytime(date: Date, timezone: string): boolean {
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }).format(date),
      10
    )
    return hour >= 6 && hour < 18
  } catch {
    return true
  }
}
