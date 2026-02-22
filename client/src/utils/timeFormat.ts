/**
 * Time formatting utilities for handling durations from microseconds up to years.
 * All internal calculations are done in microseconds for precision.
 */

/**
 * Time unit constants in microseconds.
 */
export const TIME_UNITS = {
  MICROSECOND: 1,
  MILLISECOND: 1000,
  SECOND: 1000000,
  MINUTE: 60000000,
  HOUR: 3600000000,
  DAY: 86400000000,
  WEEK: 604800000000,
  /** Average month (30.44 days) */
  MONTH: 2629746000000,
  /** Average year (365.24 days) */
  YEAR: 31556952000000,
} as const;

/**
 * Duration breakdown interface for component-based duration representation.
 */
export interface DurationBreakdown {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  microseconds: number;
}

/**
 * Unit name to microseconds mapping for parsing.
 */
const UNIT_TO_US: Record<string, number> = {
  us: TIME_UNITS.MICROSECOND,
  μs: TIME_UNITS.MICROSECOND,
  ms: TIME_UNITS.MILLISECOND,
  s: TIME_UNITS.SECOND,
  m: TIME_UNITS.MINUTE,
  min: TIME_UNITS.MINUTE,
  h: TIME_UNITS.HOUR,
  hr: TIME_UNITS.HOUR,
  d: TIME_UNITS.DAY,
  day: TIME_UNITS.DAY,
  w: TIME_UNITS.WEEK,
  wk: TIME_UNITS.WEEK,
  week: TIME_UNITS.WEEK,
  mo: TIME_UNITS.MONTH,
  mon: TIME_UNITS.MONTH,
  month: TIME_UNITS.MONTH,
  y: TIME_UNITS.YEAR,
  yr: TIME_UNITS.YEAR,
  year: TIME_UNITS.YEAR,
};

/**
 * Breaks down a duration in microseconds into its component parts.
 * 
 * @param microseconds - The duration in microseconds
 * @returns A DurationBreakdown object with all components
 * 
 * @example
 * breakdownUs(93784000000) // { years: 0, months: 0, weeks: 0, days: 1, hours: 2, minutes: 3, seconds: 4, milliseconds: 0, microseconds: 0 }
 */
export function breakdownUs(microseconds: number): DurationBreakdown {
  let remaining = Math.abs(microseconds);

  const years = Math.floor(remaining / TIME_UNITS.YEAR);
  remaining %= TIME_UNITS.YEAR;

  const months = Math.floor(remaining / TIME_UNITS.MONTH);
  remaining %= TIME_UNITS.MONTH;

  const weeks = Math.floor(remaining / TIME_UNITS.WEEK);
  remaining %= TIME_UNITS.WEEK;

  const days = Math.floor(remaining / TIME_UNITS.DAY);
  remaining %= TIME_UNITS.DAY;

  const hours = Math.floor(remaining / TIME_UNITS.HOUR);
  remaining %= TIME_UNITS.HOUR;

  const minutes = Math.floor(remaining / TIME_UNITS.MINUTE);
  remaining %= TIME_UNITS.MINUTE;

  const seconds = Math.floor(remaining / TIME_UNITS.SECOND);
  remaining %= TIME_UNITS.SECOND;

  const milliseconds = Math.floor(remaining / TIME_UNITS.MILLISECOND);
  remaining %= TIME_UNITS.MILLISECOND;

  const micros = remaining;

  return {
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds: micros,
  };
}

/**
 * Formats a duration in microseconds to a human-readable string with smart unit selection.
 * 
 * Unit selection rules:
 * - < 1 second: Show milliseconds (e.g., "456ms")
 * - < 1 minute: Show seconds and milliseconds (e.g., "12.5s" or "12s 345ms")
 * - < 1 hour: Show minutes and seconds (e.g., "5m 30s")
 * - < 1 day: Show hours and minutes (e.g., "2h 15m")
 * - < 1 week: Show days and hours (e.g., "3d 4h")
 * - < 1 month: Show weeks and days (e.g., "2w 3d")
 * - < 1 year: Show months and weeks (e.g., "3mo 1w")
 * - >= 1 year: Show years and months (e.g., "2y 6mo")
 * 
 * @param microseconds - The duration in microseconds
 * @returns A human-readable duration string
 * 
 * @example
 * formatDurationUs(456000) // "456ms"
 * formatDurationUs(12500000) // "12.5s"
 * formatDurationUs(330000000) // "5m 30s"
 * formatDurationUs(8100000000) // "2h 15m"
 * formatDurationUs(0) // "0μs"
 */
export function formatDurationUs(microseconds: number): string {
  if (microseconds === 0) return '0μs';

  const isNegative = microseconds < 0;
  const absUs = Math.abs(microseconds);
  const b = breakdownUs(absUs);

  let result: string;

  if (absUs < TIME_UNITS.SECOND) {
    result = `${b.milliseconds}ms`;
  } else if (absUs < TIME_UNITS.MINUTE) {
    if (b.milliseconds === 0) {
      result = `${b.seconds}s`;
    } else {
      const decimal = b.milliseconds / 1000;
      result = `${(b.seconds + decimal).toFixed(1).replace(/\.0$/, '')}s`;
    }
  } else if (absUs < TIME_UNITS.HOUR) {
    result = `${b.minutes}m`;
    if (b.seconds > 0) result += ` ${b.seconds}s`;
  } else if (absUs < TIME_UNITS.DAY) {
    result = `${b.hours}h`;
    if (b.minutes > 0) result += ` ${b.minutes}m`;
  } else if (absUs < TIME_UNITS.WEEK) {
    result = `${b.days}d`;
    if (b.hours > 0) result += ` ${b.hours}h`;
  } else if (absUs < TIME_UNITS.MONTH) {
    result = `${b.weeks}w`;
    if (b.days > 0) result += ` ${b.days}d`;
  } else if (absUs < TIME_UNITS.YEAR) {
    result = `${b.months}mo`;
    if (b.weeks > 0) result += ` ${b.weeks}w`;
  } else {
    result = `${b.years}y`;
    if (b.months > 0) result += ` ${b.months}mo`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Formats a duration in microseconds to a compact string for small UI elements.
 * Shows the most significant 1-2 units.
 * 
 * @param microseconds - The duration in microseconds
 * @returns A compact duration string
 * 
 * @example
 * formatDurationUsCompact(123) // "123μs"
 * formatDurationUsCompact(45000) // "45ms"
 * formatDurationUsCompact(8100000000) // "2h 15m"
 */
export function formatDurationUsCompact(microseconds: number): string {
  if (microseconds === 0) return '0μs';

  const isNegative = microseconds < 0;
  const absUs = Math.abs(microseconds);
  const b = breakdownUs(absUs);

  let result: string;

  if (absUs < TIME_UNITS.MILLISECOND) {
    result = `${b.microseconds}μs`;
  } else if (absUs < TIME_UNITS.SECOND) {
    result = `${b.milliseconds}ms`;
  } else if (absUs < TIME_UNITS.MINUTE) {
    if (b.milliseconds === 0) {
      result = `${b.seconds}s`;
    } else {
      const decimal = b.milliseconds / 1000;
      result = `${(b.seconds + decimal).toFixed(1).replace(/\.0$/, '')}s`;
    }
  } else if (absUs < TIME_UNITS.HOUR) {
    result = `${b.minutes}m`;
    if (b.seconds > 0) result += ` ${b.seconds}s`;
  } else if (absUs < TIME_UNITS.DAY) {
    result = `${b.hours}h`;
    if (b.minutes > 0) result += ` ${b.minutes}m`;
  } else if (absUs < TIME_UNITS.WEEK) {
    result = `${b.days}d`;
    if (b.hours > 0) result += ` ${b.hours}h`;
  } else if (absUs < TIME_UNITS.MONTH) {
    result = `${b.weeks}w`;
    if (b.days > 0) result += ` ${b.days}d`;
  } else if (absUs < TIME_UNITS.YEAR) {
    result = `${b.months}mo`;
    if (b.weeks > 0) result += ` ${b.weeks}w`;
  } else {
    result = `${b.years}y`;
    if (b.months > 0) result += ` ${b.months}mo`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Formats a running timer display based on elapsed time.
 * 
 * - For durations < 1 hour: Returns "MM:SS"
 * - For durations >= 1 hour: Returns "HH:MM:SS"
 * - For durations < 1 minute with showMs: Returns "SS.mmm"
 * 
 * @param startTimestamp - The start time as ISO string or Date object
 * @param showMs - Whether to show milliseconds for short durations (default: false)
 * @returns A formatted timer display string
 * 
 * @example
 * formatTimerDisplayUs(new Date(Date.now() - 30000)) // "00:30"
 * formatTimerDisplayUs(new Date(Date.now() - 3665000)) // "01:01:05"
 * formatTimerDisplayUs(new Date(Date.now() - 1500), true) // "01.500"
 */
export function formatTimerDisplayUs(
  startTimestamp: string | Date,
  showMs: boolean = false
): string {
  const start = typeof startTimestamp === 'string' 
    ? new Date(startTimestamp).getTime() 
    : startTimestamp.getTime();
  const now = Date.now();
  const elapsedMs = now - start;
  const elapsedUs = elapsedMs * TIME_UNITS.MILLISECOND;
  
  const b = breakdownUs(elapsedUs);
  
  const pad = (n: number, len: number = 2): string => n.toString().padStart(len, '0');
  
  if (showMs && elapsedMs < 60000) {
    return `${pad(b.seconds)}.${pad(b.milliseconds, 3)}`;
  }
  
  if (b.hours > 0) {
    return `${pad(b.hours)}:${pad(b.minutes)}:${pad(b.seconds)}`;
  }
  
  return `${pad(b.minutes)}:${pad(b.seconds)}`;
}

/**
 * Converts a value in a given unit to microseconds.
 * 
 * @param value - The numeric value
 * @param unit - The unit string: 'us', 'ms', 's', 'm', 'h', 'd', 'w', 'mo', 'y'
 * @returns The equivalent duration in microseconds
 * @throws Error if the unit is not recognized
 * 
 * @example
 * parseDurationToUs(1000, 'ms') // 1000000 (1 second in microseconds)
 * parseDurationToUs(1.5, 'h') // 5400000000 (1.5 hours in microseconds)
 * parseDurationToUs(30, 's') // 30000000 (30 seconds in microseconds)
 */
export function parseDurationToUs(value: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase().trim();
  const multiplier = UNIT_TO_US[normalizedUnit];
  
  if (multiplier === undefined) {
    throw new Error(`Unknown time unit: "${unit}". Valid units: us, ms, s, m, h, d, w, mo, y`);
  }
  
  return value * multiplier;
}

/**
 * Parses a human-entered duration string to microseconds.
 * 
 * Supports formats like:
 * - "1h 30m", "90m", "1.5h", "2d", "500ms", "1y 6mo"
 * - Mixed formats: "1h30m", "2w3d12h"
 * - Decimal values: "1.5h", "0.5d"
 * 
 * @param input - The duration string to parse
 * @returns The duration in microseconds, or null if parsing fails
 * 
 * @example
 * parseDurationStringToUs("1h 30m") // 5400000000
 * parseDurationStringToUs("90m") // 5400000000
 * parseDurationStringToUs("1.5h") // 5400000000
 * parseDurationStringToUs("500ms") // 500000
 * parseDurationStringToUs("invalid") // null
 */
export function parseDurationStringToUs(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  if (trimmed === '' || trimmed === '0') return 0;
  
  const pattern = /(\d+(?:\.\d+)?)\s*([a-zμ]+)/gi;
  let match: RegExpExecArray | null;
  let totalUs = 0;
  let hasMatch = false;
  
  while ((match = pattern.exec(trimmed)) !== null) {
    hasMatch = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    const multiplier = UNIT_TO_US[unit];
    if (multiplier === undefined) {
      return null;
    }
    
    totalUs += value * multiplier;
  }
  
  if (!hasMatch) {
    return null;
  }
  
  return Math.round(totalUs);
}
