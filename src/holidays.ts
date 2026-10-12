/** US federal holiday dates and observation policies. Observed dates model the common federal-office weekend rule. @module */
import {
  addDays,
  type CivilDate,
  civilDate,
  formatCivilDate,
  isLeapYear,
  weekday,
} from "./core/civil-date.ts";
/** A modeled federal holiday with its actual and commonly observed civil dates. */
export interface Holiday {
  /** Human-readable holiday name. */
  name: string;
  /** The statutory calendar date. */
  date: CivilDate;
  /** The date commonly observed by federal offices when the date falls on a weekend. */
  observedDate: CivilDate;
  /** Always `true` for values returned by the federal holiday functions. */
  federal: true;
}
function nthWeekday(
  year: number,
  month: number,
  dayOfWeek: number,
  nth: number,
): CivilDate {
  const first = civilDate(year, month, 1);
  return civilDate(
    year,
    month,
    1 + ((dayOfWeek - weekday(first) + 7) % 7) + 7 * (nth - 1),
  );
}
function lastWeekday(
  year: number,
  month: number,
  dayOfWeek: number,
): CivilDate {
  const lastDay = month === 12 ? 31 : month === 2 ? 28 : 31;
  const end = month === 2
    ? civilDate(year, month, isLeapYear(year) ? 29 : 28)
    : civilDate(year, month, lastDay);
  return addDays(end, -((weekday(end) - dayOfWeek + 7) % 7));
}
function observed(date: CivilDate): CivilDate {
  const dow = weekday(date);
  return dow === 6 ? addDays(date, -1) : dow === 0 ? addDays(date, 1) : date;
}
/** List modeled federal holiday dates for a year, including actual and commonly observed dates. */
export function getUSFederalHolidays(year: number): Holiday[] {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("year must be an integer from 1 through 9999");
  }
  const fixed = (month: number, day: number): CivilDate =>
    civilDate(year, month, day);
  const items: Array<[string, CivilDate]> = [
    ["New Year's Day", fixed(1, 1)],
    ...(year >= 1986
      ? [
        ["Birthday of Martin Luther King, Jr.", nthWeekday(year, 1, 1, 3)] as [
          string,
          CivilDate,
        ],
      ]
      : []),
    [
      "Washington's Birthday",
      year >= 1971 ? nthWeekday(year, 2, 1, 3) : fixed(2, 22),
    ],
    ["Memorial Day", lastWeekday(year, 5, 1)],
    ...(year >= 2021
      ? [
        ["Juneteenth National Independence Day", fixed(6, 19)] as [
          string,
          CivilDate,
        ],
      ]
      : []),
    ["Independence Day", fixed(7, 4)],
    ["Labor Day", nthWeekday(year, 9, 1, 1)],
    ["Columbus Day", nthWeekday(year, 10, 1, 2)],
    ["Veterans Day", fixed(11, 11)],
    ["Thanksgiving Day", nthWeekday(year, 11, 4, 4)],
    ["Christmas Day", fixed(12, 25)],
  ];
  return items.map(([name, date]) => ({
    name,
    date,
    observedDate: observed(date),
    federal: true,
  }));
}
/** Include any holiday observed within the requested year, even if its actual date is in an adjacent year. */
export function getObservedHolidays(year: number): Holiday[] {
  const all: Holiday[] = [];
  for (const sourceYear of [year - 1, year, year + 1]) {
    if (sourceYear < 1 || sourceYear > 9999) continue;
    for (const holiday of getUSFederalHolidays(sourceYear)) {
      if (holiday.observedDate.year === year) all.push(holiday);
    }
  }
  return all.sort((a, b) =>
    a.observedDate.year - b.observedDate.year ||
    a.observedDate.month - b.observedDate.month ||
    a.observedDate.day - b.observedDate.day
  );
}
/** Stable map of observed holiday ISO dates to their names. */
export function observedHolidayMap(year: number): Map<string, string> {
  return new Map(
    getObservedHolidays(year).map((
      h,
    ) => [formatCivilDate(h.observedDate), h.name]),
  );
}
