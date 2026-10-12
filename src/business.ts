/** Business-day arithmetic with explicit endpoint and closure policies. @module */
import {
  addDays,
  addMonths,
  type CivilDate,
  civilDate,
  compareDates,
  daysInMonth,
  formatCivilDate,
  fromDayNumber,
  toDayNumber,
  weekday,
} from "./core/civil-date.ts";
import { getObservedHolidays } from "./holidays.ts";
/** Workweek and holiday closures used by business-day calculations. */
export interface BusinessCalendar {
  /** Weekdays treated as closed, numbered Sunday=0 through Saturday=6. Defaults to Saturday and Sunday. */
  weekend?: readonly number[];
  /** Additional closed civil dates. */
  holidays?: readonly CivilDate[];
  /** Include modeled US federal observed dates as closures. */
  includeUSFederalHolidays?: boolean;
}
const keySet = (calendar: BusinessCalendar): Set<string> => {
  const dates = [...(calendar.holidays ?? [])];
  return new Set(dates.map(formatCivilDate));
};
function weekendSet(calendar: BusinessCalendar): Set<number> {
  const weekend = new Set(calendar.weekend ?? [0, 6]);
  if (
    [...weekend].some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new RangeError("weekend values must be weekdays from 0 through 6");
  }
  return weekend;
}
function holidaySetForRange(
  start: CivilDate,
  end: CivilDate,
  calendar: BusinessCalendar,
): Set<string> {
  const set = keySet(calendar);
  if (calendar.includeUSFederalHolidays) {
    for (let y = start.year; y <= end.year; y++) {
      for (const h of getObservedHolidays(y)) {
        set.add(formatCivilDate(h.observedDate));
      }
    }
  }
  return set;
}
function isOpen(
  date: CivilDate,
  calendar: BusinessCalendar,
  holidays: Set<string>,
): boolean {
  return !weekendSet(calendar).has(weekday(date)) &&
    !holidays.has(formatCivilDate(date));
}
/** Count business days in [start,end] by default; pass inclusive=false to count (start,end]. Reversed ranges return the negated count. */
export function countBusinessDays(
  start: CivilDate,
  end: CivilDate,
  calendar: BusinessCalendar = {},
  inclusive = true,
): number {
  const reversed = compareDates(start, end) > 0;
  const lo = reversed ? end : start, hi = reversed ? start : end;
  const holidays = holidaySetForRange(lo, hi, calendar);
  const first = toDayNumber(lo) + (inclusive ? 0 : 1);
  const last = toDayNumber(hi);
  if (first > last) return 0;
  let count = 0;
  // Weekly counting avoids scanning every day; closure dates are subtracted after the weekday count.
  const n = last - first + 1;
  const weekend = weekendSet(calendar);
  const weekSize = 7 - weekend.size;
  count = Math.floor(n / 7) * weekSize;
  for (let i = 0; i < n % 7; i++) {
    if (!weekend.has(weekday(fromDayNumber(first + i)))) count++;
  }
  for (const dateKey of holidays) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const nday = toDayNumber({ year: y, month: m, day: d });
    if (
      nday >= first && nday <= last &&
      !weekend.has(weekday({ year: y, month: m, day: d }))
    ) count--;
  }
  return reversed ? -count : count;
}
/** True when a date is a workday under the supplied calendar. */
export function isBusinessDay(
  date: CivilDate,
  calendar: BusinessCalendar = {},
): boolean {
  return isOpen(date, calendar, holidaySetForRange(date, date, calendar));
}
/** Add signed business days; the anchor is excluded, so offset 1 returns the next business day. */
export function addBusinessDays(
  anchor: CivilDate,
  offset: number,
  calendar: BusinessCalendar = {},
): CivilDate {
  if (!Number.isInteger(offset)) {
    throw new RangeError("offset must be an integer");
  }
  toDayNumber(anchor);
  let date = anchor, remaining = Math.abs(offset);
  const step = offset < 0 ? -1 : 1;
  if (weekendSet(calendar).size === 7) {
    throw new RangeError("calendar has no business weekdays");
  }
  while (remaining) {
    date = addDays(date, step);
    if (isBusinessDay(date, calendar)) remaining--;
  }
  return date;
}
/** Move to the next business day strictly after date. */
export function nextBusinessDay(
  date: CivilDate,
  calendar: BusinessCalendar = {},
): CivilDate {
  return addBusinessDays(date, 1, calendar);
}
/** Move to the previous business day strictly before date. */
export function previousBusinessDay(
  date: CivilDate,
  calendar: BusinessCalendar = {},
): CivilDate {
  return addBusinessDays(date, -1, calendar);
}
/** Generate open days in an inclusive date interval. */
export function* businessDaysBetween(
  start: CivilDate,
  end: CivilDate,
  calendar: BusinessCalendar = {},
): Generator<CivilDate> {
  if (compareDates(start, end) > 0) {
    throw new RangeError("start must not be after end");
  }
  const holidays = holidaySetForRange(start, end, calendar);
  for (let n = toDayNumber(start); n <= toDayNumber(end); n++) {
    const date = fromDayNumber(n);
    if (isOpen(date, calendar, holidays)) yield date;
  }
}

/** Date calculation used by a payment term or business deadline. */
export type DeadlineTerm =
  | { kind: "calendar-days"; days: number; includeIssueDate?: boolean }
  | { kind: "business-days"; days: number; includeIssueDate?: boolean }
  | { kind: "month-end"; months?: number };

/** Post-calculation movement for a deadline that lands on a closed date. */
export type DeadlineAdjustment =
  | "none"
  | "following-business-day"
  | "preceding-business-day";

/** Controls deadline movement and the calendar used to identify closed days. */
export interface DeadlineOptions {
  /** Movement applied after the raw term date is calculated. */
  adjustment?: DeadlineAdjustment;
  /** Weekend and holiday rules for business-day terms and adjustments. */
  calendar?: BusinessCalendar;
}

/** Traceable result separating the term result from a later closed-day adjustment. */
export interface DeadlineResult {
  /** Issue or anchor date supplied by the caller. */
  issueDate: CivilDate;
  /** Date obtained directly from the term rule. */
  rawDueDate: CivilDate;
  /** Final due date after applying the requested adjustment. */
  dueDate: CivilDate;
  /** Term rule used for the calculation. */
  term: DeadlineTerm;
  /** True when the final due date differs from the raw term date. */
  adjusted: boolean;
}

/** Calculate calendar-day, business-day, or month-end payment terms with explicit policies. */
export function calculatePaymentDeadline(
  issueDate: CivilDate,
  term: DeadlineTerm,
  options: DeadlineOptions = {},
): DeadlineResult {
  const calendar = options.calendar ?? {};
  let rawDueDate: CivilDate;
  if (term.kind === "month-end") {
    const months = term.months ?? 1;
    if (!Number.isInteger(months) || months < 0) {
      throw new RangeError("months must be a non-negative integer");
    }
    const target = addMonths(issueDate, months);
    rawDueDate = civilDate(
      target.year,
      target.month,
      daysInMonth(target.year, target.month),
    );
  } else {
    if (!Number.isInteger(term.days) || term.days < 0) {
      throw new RangeError("days must be a non-negative integer");
    }
    const includesIssueDate = term.includeIssueDate ?? false;
    if (term.kind === "calendar-days") {
      rawDueDate = addDays(issueDate, term.days - (includesIssueDate ? 1 : 0));
    } else if (term.kind === "business-days") {
      const countsAnchor = includesIssueDate &&
        isBusinessDay(issueDate, calendar);
      rawDueDate = addBusinessDays(
        issueDate,
        term.days - (countsAnchor ? 1 : 0),
        calendar,
      );
    } else {
      throw new RangeError("unsupported deadline term");
    }
  }
  const adjustment = options.adjustment ?? "none";
  if (
    adjustment !== "none" && adjustment !== "following-business-day" &&
    adjustment !== "preceding-business-day"
  ) throw new RangeError("unsupported deadline adjustment");
  const dueDate = adjustment === "none" || isBusinessDay(rawDueDate, calendar)
    ? rawDueDate
    : adjustment === "following-business-day"
    ? nextBusinessDay(rawDueDate, calendar)
    : previousBusinessDay(rawDueDate, calendar);
  return {
    issueDate,
    rawDueDate,
    dueDate,
    term: { ...term },
    adjusted: compareDates(dueDate, rawDueDate) !== 0,
  };
}

/** Convenience calculation for Net 30 calendar-day terms. */
export function calculateNet30(
  issueDate: CivilDate,
  options: DeadlineOptions = {},
): DeadlineResult {
  return calculatePaymentDeadline(
    issueDate,
    { kind: "calendar-days", days: 30 },
    options,
  );
}
