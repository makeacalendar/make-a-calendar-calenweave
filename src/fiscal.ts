/** Gregorian fiscal-year helpers and NRF-style nearest-Sunday 4-4-5 periods. @module */
import {
  addDays,
  type CivilDate,
  civilDate,
  compareDates,
  toDayNumber,
  weekday,
} from "./core/civil-date.ts";
/** Four-week/five-week/four-week ordering across each retail quarter. */
export type RetailPattern = "4-4-5" | "4-5-4" | "5-4-4";
/** One consecutive period within a retail fiscal year. */
export interface FiscalPeriod {
  /** One-based period number from 1 through 12. */
  period: number;
  /** First civil date in the period. */
  start: CivilDate;
  /** First civil date after the period. */
  endExclusive: CivilDate;
  /** Number of whole weeks in this period. */
  weeks: number;
}
/** A 52- or 53-week retail fiscal year and its twelve periods. */
export interface RetailFiscalYear {
  /** Calendar year in which this fiscal year ends. */
  label: number;
  /** First civil date in the fiscal year. */
  start: CivilDate;
  /** First civil date after the fiscal year. */
  endExclusive: CivilDate;
  /** Total number of whole weeks, either 52 or 53. */
  weeks: number;
  /** Repeating quarter pattern used for this fiscal year. */
  pattern: RetailPattern;
  /** Periods in chronological order. */
  periods: FiscalPeriod[];
}
function nearestSundayToFeb1(year: number): CivilDate {
  const feb1 = civilDate(year, 2, 1), delta = weekday(feb1);
  return addDays(feb1, delta <= 3 ? -delta : 7 - delta);
}
/** Build a 52/53-week retail year anchored at the Sunday nearest February 1. The supplied label is the year in which the year ends. */
export function createRetailFiscalYear(
  label: number,
  pattern: RetailPattern = "4-4-5",
  fiftyThirdWeek: "last-period" | "first-period" = "last-period",
): RetailFiscalYear {
  if (!Number.isInteger(label) || label < 2 || label > 9999) {
    throw new RangeError("label must be an integer from 2 through 9999");
  }
  const start = nearestSundayToFeb1(label - 1),
    endExclusive = nearestSundayToFeb1(label);
  const weeks = (toDayNumber(endExclusive) - toDayNumber(start)) / 7;
  if (weeks !== 52 && weeks !== 53) {
    throw new Error("retail year must contain 52 or 53 weeks");
  }
  const base = pattern.split("-").map(Number);
  if (base.reduce((a, b) => a + b, 0) !== 13 || base.length !== 3) {
    throw new RangeError("invalid retail pattern");
  }
  const periodWeeks = Array.from({ length: 4 }, () => [...base]).flat();
  if (weeks === 53) periodWeeks[fiftyThirdWeek === "first-period" ? 0 : 11]++;
  let cursor = start;
  const periods = periodWeeks.map((periodWeeksCount, index) => {
    const begin = cursor, finish = addDays(begin, periodWeeksCount * 7);
    cursor = finish;
    return {
      period: index + 1,
      start: begin,
      endExclusive: finish,
      weeks: periodWeeksCount,
    };
  });
  return { label, start, endExclusive, weeks, pattern, periods };
}
/** Locate a date in a retail fiscal year. */
export function getFiscalPeriod(
  date: CivilDate,
  label: number,
  pattern: RetailPattern = "4-4-5",
): { year: number; period: number; week: number } | null {
  const fy = createRetailFiscalYear(label, pattern);
  if (
    compareDates(date, fy.start) < 0 || compareDates(date, fy.endExclusive) >= 0
  ) return null;
  for (const period of fy.periods) {
    if (
      compareDates(date, period.start) >= 0 &&
      compareDates(date, period.endExclusive) < 0
    ) {
      return {
        year: label,
        period: period.period,
        week: Math.floor((toDayNumber(date) - toDayNumber(period.start)) / 7) +
          1,
      };
    }
  }
  return null;
}
/** Return period length weeks for each of the supported quarterly patterns. */
export function compareFiscalPatterns(): Record<RetailPattern, number[]> {
  return { "4-4-5": [4, 4, 5], "4-5-4": [4, 5, 4], "5-4-4": [5, 4, 4] };
}
