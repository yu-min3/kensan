/**
 * Utility functions for timeline calculations
 */

/**
 * Format time string (HH:mm:ss -> HH:mm)
 */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/**
 * Get total minutes from time string (HH:mm or HH:mm:ss)
 */
export function getMinutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Get duration in minutes between two times
 */
export function getDurationMinutes(start: string, end: string): number {
  return getMinutesFromTime(end) - getMinutesFromTime(start)
}

/**
 * Convert total minutes to time string (HH:mm)
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Snap minutes to interval (default 15 minutes)
 */
export function snapToInterval(minutes: number, interval: number = 15): number {
  return Math.round(minutes / interval) * interval
}

/**
 * Calculate top position percentage for a time
 */
export function calculateTopPosition(
  time: string,
  startHour: number,
  totalMinutes: number
): number {
  const minutes = getMinutesFromTime(time) - startHour * 60
  return (minutes / totalMinutes) * 100
}

/**
 * Calculate height percentage for a time range
 */
export function calculateHeight(
  start: string,
  end: string,
  totalMinutes: number
): number {
  const duration = getDurationMinutes(start, end)
  return (duration / totalMinutes) * 100
}

/**
 * Calculate time from Y position
 */
export function calculateTimeFromY(
  clientY: number,
  containerRect: DOMRect,
  startHour: number,
  endHour: number,
  interval: number = 15
): { startTime: string; endTime: string } {
  const totalMinutes = (endHour - startHour) * 60
  const relativeY = Math.max(0, Math.min(clientY - containerRect.top, containerRect.height))
  const percentage = relativeY / containerRect.height
  const rawMinutes = percentage * totalMinutes + startHour * 60
  const snappedMinutes = Math.round(rawMinutes / interval) * interval
  const clampedMinutes = Math.max(startHour * 60, Math.min(endHour * 60 - 60, snappedMinutes))

  const startTimeMinutes = clampedMinutes
  const endTimeMinutes = Math.min(clampedMinutes + 60, endHour * 60)

  return {
    startTime: minutesToTimeString(startTimeMinutes),
    endTime: minutesToTimeString(endTimeMinutes),
  }
}
