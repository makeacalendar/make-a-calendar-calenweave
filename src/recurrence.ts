/** Bounded, deterministic date-only recurrence generation. @module */
import {
  addDays,
  addMonths,
  type CivilDate,
  compareDates,
  daysInMonth,
  weekday,
} from "./core/civil-date.ts";
/** Bounded rule for generating recurring civil dates. */
export interface RecurrenceRule {
  /** First occurrence's civil date. */
  start: CivilDate;
  /** Supported calendar interval unit. */
  frequency: "daily" | "weekly" | "monthly";
  /** Number of frequency units between candidate dates; defaults to 1. */
  interval?: number;
  /** Optional weekdays for daily/weekly rules, Sunday=0 through Saturday=6. */
  weekdays?: readonly number[];
  /** Maximum number of emitted occurrences. */
  count?: number;
  /** Inclusive final date. */
  until?: CivilDate;
  /** Civil dates omitted from the generated sequence. */
  exclude?: readonly CivilDate[];
}
/** Lazily generate occurrences. Supply `count` or `until`; unbounded rules are rejected. Month-day overflow is clamped. */
export function* iterateRecurrence(rule: RecurrenceRule): Generator<CivilDate> {
  if (rule.count === undefined && rule.until === undefined) {
    throw new RangeError("recurrence must have a count or until bound");
  }
  if (
    rule.count !== undefined &&
    (!Number.isInteger(rule.count) || rule.count < 0)
  ) throw new RangeError("count must be a non-negative integer");
  const interval = rule.interval ?? 1;
  if (!Number.isInteger(interval) || interval < 1) {
    throw new RangeError("interval must be a positive integer");
  }
  if (rule.count === 0) return;
  const excluded = new Set(
    (rule.exclude ?? []).map((d) => `${d.year}-${d.month}-${d.day}`),
  );
  const days = rule.weekdays === undefined ? null : new Set(rule.weekdays);
  if (days && [...days].some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new RangeError("weekdays must be integers from 0 through 6");
  }
  let yielded = 0;
  if (rule.frequency === "daily") {
    for (
      let i = 0;
      rule.count === undefined || i < Number.MAX_SAFE_INTEGER;
      i++
    ) {
      const date = addDays(rule.start, i * interval);
      if (rule.until && compareDates(date, rule.until) > 0) break;
      if (
        !excluded.has(`${date.year}-${date.month}-${date.day}`) &&
        (!days || days.has(weekday(date)))
      ) {
        yield date;
        if (++yielded >= (rule.count ?? Number.MAX_SAFE_INTEGER)) return;
      }
    }
    return;
  }
  if (rule.frequency === "weekly") {
    const selected = days ?? new Set([weekday(rule.start)]);
    for (
      let week = 0;
      rule.count === undefined || yielded < rule.count;
      week += interval
    ) {
      for (let dow = 0; dow < 7; dow++) {
        if (selected.has(dow)) {
          const date = addDays(
            rule.start,
            week * 7 + ((dow - weekday(rule.start) + 7) % 7),
          );
          if (
            compareDates(date, rule.start) < 0 ||
            (rule.until && compareDates(date, rule.until) > 0)
          ) continue;
          if (!excluded.has(`${date.year}-${date.month}-${date.day}`)) {
            yield date;
            if (++yielded >= (rule.count ?? Number.MAX_SAFE_INTEGER)) return;
          }
        }
      }
      if (
        rule.until &&
        compareDates(addDays(rule.start, (week + interval) * 7), rule.until) > 0
      ) break;
    }
    return;
  }
  if (rule.frequency !== "monthly") {
    throw new RangeError("unsupported frequency");
  }
  for (
    let i = 0;
    rule.count === undefined || yielded < rule.count;
    i += interval
  ) {
    const monthStart = addMonths({
      year: rule.start.year,
      month: rule.start.month,
      day: 1,
    }, i);
    const date = {
      year: monthStart.year,
      month: monthStart.month,
      day: Math.min(
        rule.start.day,
        daysInMonth(monthStart.year, monthStart.month),
      ),
    };
    if (rule.until && compareDates(date, rule.until) > 0) break;
    if (
      compareDates(date, rule.start) >= 0 &&
      !excluded.has(`${date.year}-${date.month}-${date.day}`)
    ) {
      yield date;
      if (++yielded >= (rule.count ?? Number.MAX_SAFE_INTEGER)) return;
    }
  }
}
/** Return the date of the n-th weekday of a month; negative ordinal means last weekday. */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  ordinal: number,
): CivilDate {
  if (
    !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 ||
    !Number.isInteger(ordinal) || ordinal === 0 || ordinal < -5 || ordinal > 5
  ) throw new RangeError("invalid weekday or ordinal");
  if (ordinal > 0) {
    const first = { year, month, day: 1 };
    const day = 1 + ((dayOfWeek - weekday(first) + 7) % 7) + (ordinal - 1) * 7;
    if (day > daysInMonth(year, month)) {
      throw new RangeError("that weekday ordinal does not occur in the month");
    }
    return { year, month, day };
  }
  const lastDay = daysInMonth(year, month);
  return {
    year,
    month,
    day: lastDay -
      ((weekday({ year, month, day: lastDay }) - dayOfWeek + 7) % 7),
  };
}
