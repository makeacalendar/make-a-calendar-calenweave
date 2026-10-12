/** A Gregorian civil date, independent of time of day and timezone. Years 1–9999 are supported. */
export interface CivilDate { year: number; month: number; day: number }

/** Return a validated immutable-by-convention civil date value. */
export function civilDate(year: number, month: number, day: number): CivilDate {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be an integer from 1 through 12");
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) throw new RangeError("day is outside the selected month");
  return { year, month, day };
}

/** True for Gregorian leap years. */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be an integer from 1 through 9999");
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Number of days in a Gregorian month. */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("month must be an integer from 1 through 12");
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Parse exactly YYYY-MM-DD without relying on implementation-specific Date parsing. */
export function parseCivilDate(value: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("date must use YYYY-MM-DD format");
  return civilDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Format a validated civil date as YYYY-MM-DD. */
export function formatCivilDate(date: CivilDate): string {
  civilDate(date.year, date.month, date.day);
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** Convert a Gregorian date to an integer day number relative to 1970-01-01. */
export function toDayNumber(date: CivilDate): number {
  civilDate(date.year, date.month, date.day);
  let y = date.year;
  const m = date.month;
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = m + (m > 2 ? -3 : 9);
  const doy = Math.floor((153 * mp + 2) / 5) + date.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Convert an integer day number relative to 1970-01-01 into a civil date. */
export function fromDayNumber(days: number): CivilDate {
  if (!Number.isSafeInteger(days)) throw new RangeError("day number must be a safe integer");
  let z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  y += m <= 2 ? 1 : 0;
  return civilDate(y, m, d);
}

/** Sunday is 0, Monday 1, … Saturday 6. */
export function weekday(date: CivilDate): number { return ((toDayNumber(date) + 4) % 7 + 7) % 7; }

/** Compare two civil dates; returns -1, 0, or 1. */
export function compareDates(a: CivilDate, b: CivilDate): number { return Math.sign(toDayNumber(a) - toDayNumber(b)); }

/** Add signed civil days. */
export function addDays(date: CivilDate, amount: number): CivilDate {
  if (!Number.isSafeInteger(amount)) throw new RangeError("day amount must be a safe integer");
  return fromDayNumber(toDayNumber(date) + amount);
}

/** Add months with an explicit end-of-month policy (default: clamp). */
export function addMonths(date: CivilDate, amount: number, overflow: "clamp" | "reject" = "clamp"): CivilDate {
  civilDate(date.year, date.month, date.day);
  if (!Number.isInteger(amount)) throw new RangeError("month amount must be an integer");
  const index = date.year * 12 + date.month - 1 + amount;
  const year = Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12 + 1;
  const day = Math.min(date.day, daysInMonth(year, month));
  if (day !== date.day && overflow === "reject") throw new RangeError("target month does not contain the source day");
  return civilDate(year, month, day);
}

/** ISO week date for a civil date. */
export function isoWeek(date: CivilDate): { weekYear: number; week: number; weekday: number } {
  const dow = weekday(date) || 7;
  const thursday = addDays(date, 4 - dow);
  const jan4 = civilDate(thursday.year, 1, 4);
  const week1Monday = addDays(jan4, 1 - (weekday(jan4) || 7));
  return { weekYear: thursday.year, week: Math.floor((toDayNumber(date) - toDayNumber(week1Monday)) / 7) + 1, weekday: dow };
}

/** A day cell in a calendar grid; null means the cell lies outside the displayed month. */
export type MonthCell = CivilDate | null;
/** Generate a natural 4–6-week month grid, Sunday-first or Monday-first. */
export function createMonthGrid(year: number, month: number, weekStartsOn: 0 | 1 = 0): MonthCell[][] {
  if (weekStartsOn !== 0 && weekStartsOn !== 1) throw new RangeError("weekStartsOn must be 0 (Sunday) or 1 (Monday)");
  const first = civilDate(year, month, 1);
  const offset = (weekday(first) - weekStartsOn + 7) % 7;
  const count = Math.ceil((offset + daysInMonth(year, month)) / 7);
  return Array.from({ length: count }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const day = w * 7 + d - offset + 1;
    return day < 1 || day > daysInMonth(year, month) ? null : civilDate(year, month, day);
  }));
}
/** Generate 12 Gregorian month grids for a civil year. */
export function createYearGrid(year: number, weekStartsOn: 0 | 1 = 0): MonthCell[][][] {
  return Array.from({ length: 12 }, (_, i) => createMonthGrid(year, i + 1, weekStartsOn));
}
