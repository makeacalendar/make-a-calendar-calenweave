/** Nominal payroll dates and independently adjusted payday dates. No compensation or compliance calculations are performed. @module */
import {
  addMonths,
  type CivilDate,
  civilDate,
  daysInMonth,
  fromDayNumber,
  toDayNumber,
} from "./core/civil-date.ts";
import {
  type BusinessCalendar,
  isBusinessDay,
  nextBusinessDay,
  previousBusinessDay,
} from "./business.ts";
/** Policy used when a nominal payday lands on a closed date. */
export type PaydayAdjustment =
  | "none"
  | "following-business-day"
  | "preceding-business-day";
/** One nominal payroll date and its final payday. */
export interface PayrollOccurrence {
  /** Date produced by the selected payroll frequency before adjustment. */
  nominalDate: CivilDate;
  /** Scheduled payment date after applying the configured adjustment policy. */
  payday: CivilDate;
}
/** Rules for adjusting nominal payroll dates. */
export interface PayrollOptions {
  /** Weekend and holiday movement policy. Defaults to no movement. */
  adjustment?: PaydayAdjustment;
  /** Calendar used to decide whether a payday is open. Defaults to a Mon–Fri US federal calendar. */
  calendar?: BusinessCalendar;
}
function adjust(date: CivilDate, options: PayrollOptions): CivilDate {
  const policy = options.adjustment ?? "none",
    cal = options.calendar ??
      { weekend: [0, 6], includeUSFederalHolidays: true };
  if (
    policy !== "none" && policy !== "following-business-day" &&
    policy !== "preceding-business-day"
  ) throw new RangeError("unsupported payday adjustment policy");
  if (policy === "none" || isBusinessDay(date, cal)) return date;
  return policy === "following-business-day"
    ? nextBusinessDay(date, cal)
    : previousBusinessDay(date, cal);
}
/** Generate weekly or biweekly paydays on a stable 7/14-day chain from an anchor. */
export function generateWeeklySchedule(
  anchor: CivilDate,
  start: CivilDate,
  end: CivilDate,
  intervalWeeks = 1,
  options: PayrollOptions = {},
): PayrollOccurrence[] {
  if (!Number.isInteger(intervalWeeks) || intervalWeeks < 1) {
    throw new RangeError("intervalWeeks must be a positive integer");
  }
  const startN = toDayNumber(start),
    endN = toDayNumber(end),
    anchorN = toDayNumber(anchor);
  if (startN > endN) throw new RangeError("start must not be after end");
  const step = 7 * intervalWeeks;
  let n = anchorN + Math.ceil((startN - anchorN) / step) * step;
  const result: PayrollOccurrence[] = [];
  for (; n <= endN; n += step) {
    const nominalDate = fromDayNumber(n);
    result.push({ nominalDate, payday: adjust(nominalDate, options) });
  }
  return result;
}
/** Generate a semi-monthly schedule on two configured day numbers; short months clamp to month end. */
export function generateSemiMonthlySchedule(
  start: CivilDate,
  end: CivilDate,
  days: readonly [number, number] = [1, 15],
  options: PayrollOptions = {},
): PayrollOccurrence[] {
  if (
    days[0] < 1 || days[1] < 1 || days[0] > 31 || days[1] > 31 ||
    days[0] >= days[1]
  ) throw new RangeError("days must be increasing integers in 1..31");
  if (toDayNumber(start) > toDayNumber(end)) {
    throw new RangeError("start must not be after end");
  }
  const out: PayrollOccurrence[] = [];
  for (
    let y = start.year, m = start.month;
    y < end.year || (y === end.year && m <= end.month);
  ) {
    for (const requested of days) {
      const nominalDate = civilDate(
        y,
        m,
        Math.min(requested, daysInMonth(y, m)),
      );
      if (
        toDayNumber(nominalDate) >= toDayNumber(start) &&
        toDayNumber(nominalDate) <= toDayNumber(end)
      ) out.push({ nominalDate, payday: adjust(nominalDate, options) });
    }
    const next = addMonths(civilDate(y, m, 1), 1);
    y = next.year;
    m = next.month;
  }
  return out;
}

/** Generate one monthly payday, clamping short months to their final day. */
export function generateMonthlySchedule(
  start: CivilDate,
  end: CivilDate,
  day = 1,
  options: PayrollOptions = {},
): PayrollOccurrence[] {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError("day must be an integer from 1 through 31");
  }
  if (toDayNumber(start) > toDayNumber(end)) {
    throw new RangeError("start must not be after end");
  }
  const out: PayrollOccurrence[] = [];
  for (
    let y = start.year, m = start.month;
    y < end.year || (y === end.year && m <= end.month);
  ) {
    const nominalDate = civilDate(y, m, Math.min(day, daysInMonth(y, m)));
    if (
      toDayNumber(nominalDate) >= toDayNumber(start) &&
      toDayNumber(nominalDate) <= toDayNumber(end)
    ) out.push({ nominalDate, payday: adjust(nominalDate, options) });
    const next = addMonths(civilDate(y, m, 1), 1);
    y = next.year;
    m = next.month;
  }
  return out;
}
/** Return nominal-date months containing three biweekly occurrences. */
export function threePaycheckMonths(
  schedule: readonly PayrollOccurrence[],
): number[] {
  const counts = new Map<number, number>();
  for (const item of schedule) {
    counts.set(
      item.nominalDate.year * 100 + item.nominalDate.month,
      (counts.get(item.nominalDate.year * 100 + item.nominalDate.month) ?? 0) +
        1,
    );
  }
  return [...counts].filter(([, count]) => count >= 3).map(([month]) => month);
}
