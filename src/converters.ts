/** Numeric epoch conversions that keep civil dates separate from instants. @module */
import {
  type CivilDate,
  civilDate,
  daysInYear,
  fromDayNumber,
  isoWeek,
  parseCivilDate,
  toDayNumber,
} from "./core/civil-date.ts";

/** Convert an ISO calendar date string (`YYYY-MM-DD`) to a validated civil date. */
export function isoDateToCivilDate(value: string): CivilDate {
  return parseCivilDate(value);
}

/** Format a civil date as an ISO calendar date (`YYYY-MM-DD`). */
export function civilDateToISODate(date: CivilDate): string {
  const year = String(date.year).padStart(4, "0");
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  civilDate(date.year, date.month, date.day);
  return `${year}-${month}-${day}`;
}

/** ISO week-date components for a civil date. */
export interface ISOWeekDate {
  /** ISO week-year, which can differ from the Gregorian calendar year. */
  weekYear: number;
  /** ISO week number from 1 through 52 or 53. */
  week: number;
  /** ISO weekday from 1 (Monday) through 7 (Sunday). */
  weekday: number;
}

/** Convert a civil date to its ISO week-date components. */
export function civilDateToISOWeekDate(date: CivilDate): ISOWeekDate {
  const result = isoWeek(date);
  return {
    weekYear: result.weekYear,
    week: result.week,
    weekday: result.weekday,
  };
}

/** Convert a year and one-based day-of-year to a civil date. */
export function ordinalDateToCivilDate(year: number, day: number): CivilDate {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("year must be an integer from 1 through 9999");
  }
  if (!Number.isInteger(day) || day < 1 || day > daysInYear(year)) {
    throw new RangeError("day must be valid for the selected year");
  }
  return fromDayNumber(toDayNumber(civilDate(year, 1, 1)) + day - 1);
}

/** Return the Gregorian year and one-based day-of-year. */
export function civilDateToOrdinalDate(
  date: CivilDate,
): { year: number; day: number } {
  civilDate(date.year, date.month, date.day);
  return {
    year: date.year,
    day: toDayNumber(date) - toDayNumber(civilDate(date.year, 1, 1)) + 1,
  };
}

/** Format a civil date using ISO ordinal form (`YYYY-DDD`). */
export function formatOrdinalDate(date: CivilDate): string {
  const ordinal = civilDateToOrdinalDate(date);
  return String(ordinal.year).padStart(4, "0") + "-" +
    String(ordinal.day).padStart(3, "0");
}

/** Parse a Gregorian ISO ordinal date string (`YYYY-DDD`). */
export function parseOrdinalDate(value: string): CivilDate {
  const match = /^(\d{4})-(\d{3})$/.exec(value);
  if (!match) throw new RangeError("ordinal date must use YYYY-DDD format");
  return ordinalDateToCivilDate(Number(match[1]), Number(match[2]));
}
/** Convert an Excel 1900-system serial to a civil date; serial 60 is the fictitious 1900-02-29 and is rejected by default. */
export function excelSerialToDate(
  serial: number,
  phantomDay: "reject" | "feb-28" | "mar-1" = "reject",
): CivilDate {
  if (!Number.isFinite(serial) || !Number.isInteger(serial) || serial < 1) {
    throw new RangeError(
      "serial must be a positive whole-day 1900-system value",
    );
  }
  if (serial === 60) {
    if (phantomDay === "feb-28") return civilDate(1900, 2, 28);
    if (phantomDay === "mar-1") return civilDate(1900, 3, 1);
    throw new RangeError(
      "Excel serial 60 represents the nonexistent date 1900-02-29",
    );
  }
  return fromDayNumber(serial - (serial >= 61 ? 25569 : 25568));
}
/** Convert a civil date to an Excel 1900-system serial, preserving Excel's serial-60 compatibility gap. */
export function dateToExcelSerial(date: CivilDate): number {
  const n = toDayNumber(date) + 25568;
  // Excel inserts its fictitious 1900-02-29 between serials 59 and 61.
  return date.year > 1900 || (date.year === 1900 && date.month >= 3)
    ? n + 1
    : n;
}
/** Convert Unix milliseconds to UTC civil date (time-of-day is discarded). */
export function unixMillisecondsToDate(milliseconds: number): CivilDate {
  if (!Number.isFinite(milliseconds)) {
    throw new RangeError("milliseconds must be finite");
  }
  return fromDayNumber(Math.floor(milliseconds / 86400000));
}
/** Convert a UTC civil date to midnight Unix milliseconds. */
export function dateToUnixMilliseconds(date: CivilDate): number {
  return toDayNumber(date) * 86400000;
}
/** Convert Windows FILETIME 100-nanosecond ticks to Unix milliseconds; negative/pre-Unix values are supported. */
export function filetimeToUnixMilliseconds(ticks: bigint): number {
  const delta = ticks - 116444736000000000n;
  const divisor = 10000n;
  const quotient = delta / divisor;
  const remainder = delta % divisor;
  return Number(delta < 0n && remainder !== 0n ? quotient - 1n : quotient);
}
/** Convert a FILETIME instant to its UTC civil date. */
export function filetimeToDate(ticks: bigint): CivilDate {
  return unixMillisecondsToDate(filetimeToUnixMilliseconds(ticks));
}
/** Convert a civil date to its Julian Day Number at UTC midnight (integer JDN). */
export function toJulianDayNumber(date: CivilDate): number {
  return toDayNumber(date) + 2440588;
}
/** Convert an integer Julian Day Number at UTC midnight to a civil date. */
export function fromJulianDayNumber(jdn: number): CivilDate {
  if (!Number.isSafeInteger(jdn)) {
    throw new RangeError("JDN must be a safe integer");
  }
  return fromDayNumber(jdn - 2440588);
}
