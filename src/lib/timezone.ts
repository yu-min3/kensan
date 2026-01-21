/**
 * Timezone utilities for converting local dates to UTC ranges
 *
 * The database stores all timestamps in UTC. When querying for a specific
 * local date, we need to convert it to the corresponding UTC range.
 *
 * Example: JST 2026-01-21 (Asia/Tokyo, UTC+9)
 *   - Start: 2026-01-21 00:00:00 JST = 2026-01-20 15:00:00 UTC
 *   - End:   2026-01-21 23:59:59 JST = 2026-01-21 14:59:59 UTC
 */

// Timezone offset in hours (positive for east of UTC)
const TIMEZONE_OFFSETS: Record<string, number> = {
  'Asia/Tokyo': 9,
  'UTC': 0,
}

/**
 * Get the UTC offset in hours for a timezone
 */
export function getTimezoneOffset(timezone: string): number {
  return TIMEZONE_OFFSETS[timezone] ?? 9 // Default to JST
}

/**
 * Convert a local date string to UTC date range
 *
 * @param localDate - Date string in YYYY-MM-DD format (in user's timezone)
 * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
 * @returns Object with startUtc and endUtc in ISO format
 */
export function localDateToUtcRange(
  localDate: string,
  timezone: string
): { startUtc: string; endUtc: string } {
  const offset = getTimezoneOffset(timezone)

  // Parse the local date
  const [year, month, day] = localDate.split('-').map(Number)

  // Create date at start of day in local timezone (00:00:00)
  // Then convert to UTC by subtracting the offset
  const localStartMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  const utcStartMs = localStartMs - (offset * 60 * 60 * 1000)

  // End of day is start of next day
  const localEndMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0)
  const utcEndMs = localEndMs - (offset * 60 * 60 * 1000)

  const startUtc = new Date(utcStartMs).toISOString()
  const endUtc = new Date(utcEndMs).toISOString()

  return { startUtc, endUtc }
}

/**
 * Convert a local date to the possible UTC dates it could span
 *
 * For JST, a single day can span 2 UTC dates:
 * - JST 2026-01-21 00:00 = UTC 2026-01-20 15:00
 * - JST 2026-01-21 23:59 = UTC 2026-01-21 14:59
 *
 * @param localDate - Date string in YYYY-MM-DD format
 * @param timezone - User's timezone
 * @returns Array of UTC date strings that the local date spans
 */
export function localDateToUtcDates(
  localDate: string,
  timezone: string
): string[] {
  const { startUtc, endUtc } = localDateToUtcRange(localDate, timezone)

  const startDate = startUtc.split('T')[0]
  const endDate = endUtc.split('T')[0]

  if (startDate === endDate) {
    return [startDate]
  }

  return [startDate, endDate]
}

/**
 * Format a Date object to YYYY-MM-DD in a specific timezone
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  const offset = getTimezoneOffset(timezone)
  const localMs = date.getTime() + (offset * 60 * 60 * 1000)
  const localDate = new Date(localMs)

  const year = localDate.getUTCFullYear()
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(localDate.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get today's date in a specific timezone
 */
export function getTodayInTimezone(timezone: string): string {
  return formatDateInTimezone(new Date(), timezone)
}

/**
 * Convert UTC date and time to local date and time
 *
 * @param utcDate - Date string in YYYY-MM-DD format (UTC)
 * @param utcTime - Time string in HH:mm or HH:mm:ss format (UTC)
 * @param timezone - Target timezone (e.g., 'Asia/Tokyo')
 * @returns Object with local date (YYYY-MM-DD) and time (HH:mm)
 */
export function utcToLocalDateTime(
  utcDate: string,
  utcTime: string,
  timezone: string
): { date: string; time: string } {
  const offset = getTimezoneOffset(timezone)

  // Parse UTC date and time
  const [year, month, day] = utcDate.split('-').map(Number)
  const timeParts = utcTime.split(':').map(Number)
  const hours = timeParts[0]
  const minutes = timeParts[1]

  // Create UTC timestamp
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0)

  // Add timezone offset to get local time
  const localMs = utcMs + offset * 60 * 60 * 1000
  const localDate = new Date(localMs)

  const localYear = localDate.getUTCFullYear()
  const localMonth = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const localDay = String(localDate.getUTCDate()).padStart(2, '0')
  const localHours = String(localDate.getUTCHours()).padStart(2, '0')
  const localMinutes = String(localDate.getUTCMinutes()).padStart(2, '0')

  return {
    date: `${localYear}-${localMonth}-${localDay}`,
    time: `${localHours}:${localMinutes}`,
  }
}
