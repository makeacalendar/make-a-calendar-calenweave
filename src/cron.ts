/** Bounded five-field cron matching over civil dates and UTC-like clock fields, with no timezone/DST model. @module */
import { addDays, type CivilDate, weekday } from "./core/civil-date.ts";
/** Parsed numeric cron fields and wildcard flags for standard day matching. */
export interface CronSchedule {
  /** Allowed minute values from 0 through 59. */
  minute: ReadonlySet<number>;
  /** Allowed hour values from 0 through 23. */
  hour: ReadonlySet<number>;
  /** Allowed day-of-month values from 1 through 31. */
  dayOfMonth: ReadonlySet<number>;
  /** Allowed month values from 1 through 12. */
  month: ReadonlySet<number>;
  /** Allowed weekdays, Sunday=0 (7 is accepted as an alias). */
  dayOfWeek: ReadonlySet<number>;
  /** Whether the day-of-month field was the wildcard `*`. */
  dayOfMonthWildcard: boolean;
  /** Whether the day-of-week field was the wildcard `*`. */
  dayOfWeekWildcard: boolean;
}
/** A civil-date and minute-resolution clock value matched by a cron schedule. */
export interface CronRun {
  /** Civil date in the schedule's UTC-like, timezone-free model. */
  date: CivilDate;
  /** Hour from 0 through 23. */
  hour: number;
  /** Minute from 0 through 59. */
  minute: number;
}
const fieldRanges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const;
function parseField(
  text: string,
  index: number,
): { values: Set<number>; wildcard: boolean } {
  const [min, max] = fieldRanges[index];
  const wildcard = text === "*";
  const values = new Set<number>();
  for (const item of text.split(",")) {
    if (!item) throw new RangeError("empty cron list item");
    const [base, stepText, extra] = item.split("/");
    if (extra !== undefined) throw new RangeError("invalid cron step");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step <= 0) {
      throw new RangeError("cron step must be a positive integer");
    }
    let first: number, last: number;
    if (base === "*") {
      first = min;
      last = max;
    } else if (base.includes("-")) {
      const parts = base.split("-");
      if (parts.length !== 2) throw new RangeError("invalid cron range");
      first = Number(parts[0]);
      last = Number(parts[1]);
    } else {
      first = Number(base);
      last = stepText === undefined ? first : max;
    }
    if (
      !Number.isInteger(first) || !Number.isInteger(last) || first < min ||
      last > max || first > last
    ) {
      throw new RangeError(
        "cron value or range is outside the supported field range",
      );
    }
    for (let value = first; value <= last; value += step) {
      values.add(index === 4 && value === 7 ? 0 : value);
    }
  }
  return { values, wildcard };
}
/** Parse a standard numeric five-field cron expression (minute hour day-of-month month day-of-week). */
export function parseCron(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new RangeError("only five-field cron expressions are supported");
  }
  const parsed = fields.map((field, i) => parseField(field, i));
  return {
    minute: parsed[0].values,
    hour: parsed[1].values,
    dayOfMonth: parsed[2].values,
    month: parsed[3].values,
    dayOfWeek: parsed[4].values,
    dayOfMonthWildcard: parsed[2].wildcard,
    dayOfWeekWildcard: parsed[4].wildcard,
  };
}
/** Test a civil date and 24-hour clock time against a parsed schedule. */
export function matchesCron(
  schedule: CronSchedule,
  date: CivilDate,
  hour: number,
  minute: number,
): boolean {
  if (
    !Number.isInteger(hour) || hour < 0 || hour > 23 ||
    !Number.isInteger(minute) || minute < 0 || minute > 59
  ) throw new RangeError("time must be a valid 24-hour hour and minute");
  const dom = schedule.dayOfMonth.has(date.day),
    dow = schedule.dayOfWeek.has(weekday(date));
  const dayMatches = schedule.dayOfMonthWildcard
    ? dow
    : schedule.dayOfWeekWildcard
    ? dom
    : dom || dow;
  return schedule.minute.has(minute) && schedule.hour.has(hour) &&
    schedule.month.has(date.month) && dayMatches;
}
/** Find the next matching civil date/time values, scanning at minute resolution within an explicit day bound. */
export function nextCronRuns(
  expression: string,
  from: CronRun,
  count: number,
  maxDays = 366,
): CronRun[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative integer");
  }
  if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 36600) {
    throw new RangeError("maxDays must be an integer from 1 through 36600");
  }
  if (!count) return [];
  const schedule = parseCron(expression), out: CronRun[] = [];
  let date = from.date;
  const { hour, minute } = from;
  if (
    !Number.isInteger(hour) || hour < 0 || hour > 23 ||
    !Number.isInteger(minute) || minute < 0 || minute > 59
  ) throw new RangeError("from must have valid hour and minute");
  for (let offset = 0; offset < maxDays && out.length < count; offset++) {
    const begin = offset === 0 ? hour * 60 + minute : 0;
    for (
      let clockMinute = begin;
      clockMinute < 1440 && out.length < count;
      clockMinute++
    ) {
      const h = Math.floor(clockMinute / 60), m = clockMinute % 60;
      if (
        (offset > 0 || clockMinute > begin) && matchesCron(schedule, date, h, m)
      ) out.push({ date, hour: h, minute: m });
    }
    date = addDays(date, 1);
  }
  if (out.length < count) {
    throw new RangeError(
      `only ${out.length} runs found within ${maxDays} days`,
    );
  }
  return out;
}
