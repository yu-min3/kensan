/**
 * Timezone utilities for converting between local dates/times and UTC ISO datetimes
 *
 * The database stores all timestamps as TIMESTAMPTZ (effectively UTC).
 * The API returns UTC ISO 8601 strings (e.g., "2026-01-20T15:00:00Z").
 * Frontend is responsible for all timezone conversion.
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
 * Get the local date (YYYY-MM-DD) from an ISO 8601 UTC datetime string
 *
 * @param isoDatetime - ISO 8601 UTC string (e.g., "2026-01-20T15:00:00Z")
 * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
 * @returns Local date string in YYYY-MM-DD format
 */
export function getLocalDate(isoDatetime: string, timezone: string): string {
  const date = new Date(isoDatetime)
  return formatDateInTimezone(date, timezone)
}

/**
 * Get the local time (HH:mm) from an ISO 8601 UTC datetime string
 *
 * @param isoDatetime - ISO 8601 UTC string (e.g., "2026-01-20T15:00:00Z")
 * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
 * @returns Local time string in HH:mm format
 */
export function getLocalTime(isoDatetime: string, timezone: string): string {
  const offset = getTimezoneOffset(timezone)
  const date = new Date(isoDatetime)
  const localMs = date.getTime() + (offset * 60 * 60 * 1000)
  const localDate = new Date(localMs)

  const hours = String(localDate.getUTCHours()).padStart(2, '0')
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * Convert a local date and time to a UTC ISO 8601 datetime string
 *
 * @param localDate - Date string in YYYY-MM-DD format (user's local timezone)
 * @param localTime - Time string in HH:mm format (user's local timezone)
 * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
 * @returns ISO 8601 UTC datetime string (e.g., "2026-01-20T15:00:00.000Z")
 */
export function localToUtcDatetime(
  localDate: string,
  localTime: string,
  timezone: string
): string {
  const offset = getTimezoneOffset(timezone)

  // Parse local date and time
  const [year, month, day] = localDate.split('-').map(Number)
  const timeParts = localTime.split(':').map(Number)
  const hours = timeParts[0]
  const minutes = timeParts[1]

  // Create timestamp at local time, then subtract offset to get UTC
  const localMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0)
  const utcMs = localMs - offset * 60 * 60 * 1000

  return new Date(utcMs).toISOString()
}
