/**
 * Date validation utilities for the booking system
 */

export interface DateFilterOptions {
  date?: string
  startDate?: string
  endDate?: string
  limit?: number
}

/**
 * Validates if a date string can be parsed into a valid Date object
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false
  }
  
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Safely creates a Date object from a string, returns null if invalid
 * Prefers timezone-safe parsing for booking dates
 */
export function safeCreateDate(dateString: string | null | undefined): Date | null {
  if (!isValidDateString(dateString)) {
    return null
  }
  
  // Try timezone-safe parsing first for YYYY-MM-DD format
  const parsedDate = parseBookingDate(dateString!)
  if (parsedDate) {
    return parsedDate
  }
  
  // Fallback to regular Date parsing for other formats
  const date = new Date(dateString!)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Validates and sanitizes date filter options for booking availability queries
 */
export function validateDateFilters(options: DateFilterOptions): {
  isValid: boolean
  errors: string[]
  validatedOptions: {
    date?: Date
    startDate?: Date
    endDate?: Date
    limit: number
  }
} {
  const errors: string[] = []
  const validatedOptions: {
    date?: Date
    startDate?: Date
    endDate?: Date
    limit: number
  } = {
    limit: Math.min(Math.max(options.limit || 30, 1), 365) // Limit between 1 and 365
  }

  // Validate single date filter
  if (options.date) {
    const date = safeCreateDate(options.date)
    if (!date) {
      errors.push(`Invalid date format: ${options.date}`)
    } else {
      validatedOptions.date = date
    }
  }

  // Validate start date
  if (options.startDate) {
    const startDate = safeCreateDate(options.startDate)
    if (!startDate) {
      errors.push(`Invalid start date format: ${options.startDate}`)
    } else {
      validatedOptions.startDate = startDate
    }
  }

  // Validate end date
  if (options.endDate) {
    const endDate = safeCreateDate(options.endDate)
    if (!endDate) {
      errors.push(`Invalid end date format: ${options.endDate}`)
    } else {
      validatedOptions.endDate = endDate
    }
  }

  // Validate date range logic
  if (validatedOptions.startDate && validatedOptions.endDate) {
    if (validatedOptions.startDate > validatedOptions.endDate) {
      errors.push('Start date cannot be after end date')
    }
  }

  // Don't allow both single date and date range
  if (validatedOptions.date && (validatedOptions.startDate || validatedOptions.endDate)) {
    errors.push('Cannot specify both single date and date range filters')
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedOptions
  }
}

/**
 * Formats a date to ISO string format (YYYY-MM-DD) for consistent database queries
 * Uses local timezone to prevent date shifts
 */
export function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a date for booking submissions (timezone-safe)
 * Ensures the selected date is preserved exactly as chosen by the user
 */
export function formatDateForBooking(date: Date): string {
  return formatDateForDatabase(date)
}

/**
 * Parses a booking date string back to a Date object
 * Creates the date in local timezone to prevent shifts
 */
export function parseBookingDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null
  }

  // Match YYYY-MM-DD format
  const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateMatch) {
    return null
  }

  const [, year, month, day] = dateMatch
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10) - 1 // Month is 0-indexed
  const dayNum = parseInt(day, 10)

  // Create date in local timezone
  const date = new Date(yearNum, monthNum, dayNum)
  
  // Verify the date components match (handles invalid dates like Feb 31)
  if (date.getFullYear() !== yearNum || 
      date.getMonth() !== monthNum || 
      date.getDate() !== dayNum) {
    return null
  }

  return date
}

/**
 * Creates a time Date object from a time string (HH:MM or HH:MM:SS)
 */
export function createTimeFromString(timeString: string): Date | null {
  if (!timeString || typeof timeString !== 'string') {
    return null
  }

  // Handle both HH:MM and HH:MM:SS formats
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!timeMatch) {
    return null
  }

  const [, hours, minutes, seconds = '00'] = timeMatch
  const hoursNum = parseInt(hours, 10)
  const minutesNum = parseInt(minutes, 10)
  const secondsNum = parseInt(seconds, 10)

  // Validate time components
  if (hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59 || secondsNum < 0 || secondsNum > 59) {
    return null
  }

  // Create date with base date of 1970-01-01 (epoch) for time-only storage
  return new Date(`1970-01-01T${hours.padStart(2, '0')}:${minutes}:${seconds.padStart(2, '0')}`)
}