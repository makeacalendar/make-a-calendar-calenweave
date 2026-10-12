import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  addMonths,
  addYears,
  civilDate,
  createFixedSixWeekMonthGrid,
  createMonthGrid,
  createMonthSpan,
  datesBetween,
  dayOfYear,
  daysInYear,
  differenceInDays,
  fromDayNumber,
  isLeapYear,
  isoWeek,
  parseCivilDate,
  toDayNumber,
  weekday,
} from "../src/core/mod.ts";
import { getObservedHolidays, getUSFederalHolidays } from "../src/holidays.ts";
import {
  addBusinessDays,
  calculateNet30,
  calculatePaymentDeadline,
  countBusinessDays,
  isBusinessDay,
} from "../src/business.ts";
import {
  generateMonthlySchedule,
  generateSemiMonthlySchedule,
  generateWeeklySchedule,
  threePaycheckMonths,
} from "../src/payroll.ts";
import { generateShiftRotation, shiftPatterns } from "../src/shifts.ts";
import { createRetailFiscalYear, getFiscalPeriod } from "../src/fiscal.ts";
import { iterateRecurrence } from "../src/recurrence.ts";
import { matchesCron, nextCronRuns, parseCron } from "../src/cron.ts";
import {
  civilDateToISODate,
  civilDateToISOWeekDate,
  civilDateToOrdinalDate,
  dateToExcelSerial,
  excelSerialToDate,
  filetimeToDate,
  formatOrdinalDate,
  fromJulianDayNumber,
  ordinalDateToCivilDate,
  parseOrdinalDate,
  toJulianDayNumber,
} from "../src/converters.ts";
import {
  renderCalendarHTML,
  renderCalendarPrintHTML,
  renderCalendarSVG,
} from "../src/rendering.ts";
import {
  exportCalendarCSV,
  exportCalendarJSON,
  generateICS,
} from "../src/exports.ts";

const iso = (d: { year: number; month: number; day: number }) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${
    String(d.day).padStart(2, "0")
  }`;

test("Gregorian boundaries and reversible integer day arithmetic", () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(2024), true);
  assert.equal(iso(addDays(civilDate(2024, 2, 29), 1)), "2024-03-01");
  assert.equal(iso(addMonths(civilDate(2024, 1, 31), 1)), "2024-02-29");
  assert.throws(() => addMonths(civilDate(2024, 1, 31), 1, "reject"));
  assert.equal(iso(addYears(civilDate(2024, 2, 29), 1)), "2025-02-28");
  assert.throws(() => addYears(civilDate(2024, 2, 29), 1, "reject"));
  assert.equal(daysInYear(2024), 366);
  assert.equal(dayOfYear(civilDate(2024, 12, 31)), 366);
  assert.equal(
    differenceInDays(civilDate(2027, 1, 1), civilDate(2027, 1, 4)),
    3,
  );
  assert.deepEqual(
    [...datesBetween(civilDate(2027, 1, 1), civilDate(2027, 1, 3), false)].map(
      iso,
    ),
    [
      "2027-01-01",
      "2027-01-02",
    ],
  );
  for (
    const d of [
      civilDate(2000, 2, 29),
      civilDate(2024, 2, 29),
      civilDate(2026, 12, 31),
      civilDate(2027, 1, 1),
      civilDate(2100, 2, 28),
    ]
  ) assert.equal(iso(fromDayNumber(toDayNumber(d))), iso(d));
  assert.throws(() => parseCivilDate("2027-02-29"));
});

test("weekday, ISO rollover and Monday-start layout", () => {
  assert.equal(weekday(civilDate(2027, 1, 1)), 5);
  assert.deepEqual(isoWeek(civilDate(2027, 1, 1)), {
    weekYear: 2026,
    week: 53,
    weekday: 5,
  });
  assert.deepEqual(isoWeek(civilDate(2027, 1, 4)), {
    weekYear: 2027,
    week: 1,
    weekday: 1,
  });
  assert.equal(createMonthGrid(2027, 1, 1).length, 5);
  assert.equal(createMonthGrid(2027, 1, 1)[0][4]?.day, 1);
  assert.equal(createFixedSixWeekMonthGrid(2027, 1, 1).length, 6);
  assert.deepEqual(createMonthSpan(2026, 12, 2).map((month) => month.length), [
    5,
    6,
  ]);
});

test("federal actual and observed dates include history and cross-year observance", () => {
  assert.equal(
    getUSFederalHolidays(2020).some((h) => h.name.startsWith("Juneteenth")),
    false,
  );
  assert.equal(
    getUSFederalHolidays(2021).some((h) => h.name.startsWith("Juneteenth")),
    true,
  );
  assert.equal(
    getUSFederalHolidays(1985).some((h) => h.name.includes("King")),
    false,
  );
  assert.equal(
    getUSFederalHolidays(1986).some((h) => h.name.includes("King")),
    true,
  );
  assert.equal(
    getObservedHolidays(2021).some((h) =>
      iso(h.observedDate) === "2021-12-31" && h.name === "New Year's Day"
    ),
    true,
  );
});

test("business days support endpoints, holidays, and signed offsets", () => {
  const cal = { includeUSFederalHolidays: true };
  assert.equal(
    countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 4), cal),
    1,
  );
  assert.equal(
    countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 4), cal, false),
    1,
  );
  assert.equal(
    iso(addBusinessDays(civilDate(2027, 1, 15), 1, cal)),
    "2027-01-19",
  );
  assert.equal(
    iso(addBusinessDays(civilDate(2027, 1, 19), -1, cal)),
    "2027-01-15",
  );
  assert.equal(isBusinessDay(civilDate(2027, 1, 18), cal), false);
  assert.equal(
    countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 5), {
      weekend: [0, 6, 6],
    }),
    3,
  );
  assert.throws(() =>
    countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 5), {
      weekend: [8],
    })
  );
  assert.throws(() =>
    addBusinessDays(civilDate(2027, 1, 1), 1, {
      weekend: [0, 1, 2, 3, 4, 5, 6],
    })
  );
  const net30 = calculateNet30(civilDate(2027, 1, 1));
  assert.equal(iso(net30.rawDueDate), "2027-01-31");
  assert.equal(iso(net30.dueDate), "2027-01-31");
  const monthEnd = calculatePaymentDeadline(civilDate(2027, 1, 15), {
    kind: "month-end",
    months: 1,
  });
  assert.equal(iso(monthEnd.rawDueDate), "2027-02-28");
  const businessTerm = calculatePaymentDeadline(civilDate(2027, 1, 15), {
    kind: "business-days",
    days: 1,
    includeIssueDate: true,
  });
  assert.equal(iso(businessTerm.dueDate), "2027-01-15");
});

test("payroll nominal dates remain distinct from adjusted dates", () => {
  const biweekly = generateWeeklySchedule(
    civilDate(2027, 1, 1),
    civilDate(2027, 1, 1),
    civilDate(2027, 12, 31),
    2,
  );
  assert.ok(biweekly.length === 26 || biweekly.length === 27);
  assert.equal(biweekly[0].nominalDate.day, 1);
  const semi = generateSemiMonthlySchedule(
    civilDate(2027, 2, 1),
    civilDate(2027, 2, 28),
    [15, 31],
  );
  assert.deepEqual(semi.map((x) => iso(x.nominalDate)), [
    "2027-02-15",
    "2027-02-28",
  ]);
  const monthly = generateMonthlySchedule(
    civilDate(2027, 2, 1),
    civilDate(2027, 3, 31),
    31,
  );
  assert.deepEqual(monthly.map((x) => iso(x.nominalDate)), [
    "2027-02-28",
    "2027-03-31",
  ]);
  assert.ok(threePaycheckMonths(biweekly).length >= 2);
});

test("shift rotation preserves its cycle phase", () => {
  const rotation = generateShiftRotation(
    { anchor: civilDate(2024, 2, 27), pattern: shiftPatterns.twoTwoThree },
    civilDate(2024, 2, 27),
    civilDate(2024, 3, 4),
  );
  assert.deepEqual(rotation.map((x) => x.working), [
    true,
    true,
    false,
    false,
    true,
    true,
    true,
  ]);
});

test("retail fiscal periods span 52 or 53 complete weeks", () => {
  for (const year of [2023, 2024, 2025, 2026, 2027]) {
    const fy = createRetailFiscalYear(year, "4-4-5");
    assert.ok(fy.weeks === 52 || fy.weeks === 53);
    assert.equal(fy.periods.length, 12);
    assert.equal(getFiscalPeriod(fy.start, year, "4-4-5")?.period, 1);
  }
});

test("recurrence is bounded and exclusion-aware", () => {
  assert.deepEqual(
    [...iterateRecurrence({
      start: civilDate(2027, 1, 1),
      frequency: "weekly",
      weekdays: [1, 3],
      count: 4,
    })].map(iso),
    ["2027-01-04", "2027-01-06", "2027-01-11", "2027-01-13"],
  );
  assert.deepEqual(
    [...iterateRecurrence({
      start: civilDate(2027, 1, 31),
      frequency: "monthly",
      count: 3,
    })].map(iso),
    ["2027-01-31", "2027-02-28", "2027-03-31"],
  );
  assert.throws(
    () => [
      ...iterateRecurrence({
        start: civilDate(2027, 1, 1),
        frequency: "daily",
      }),
    ],
  );
});

test("cron parser supports ranges, steps, Sunday aliases, OR day matching and bounded runs", () => {
  const schedule = parseCron("*/15 9-10 1 * 1");
  assert.equal(matchesCron(schedule, civilDate(2027, 2, 1), 9, 30), true);
  assert.equal(matchesCron(schedule, civilDate(2027, 2, 2), 9, 30), false);
  assert.equal(parseCron("0 0 * * 7").dayOfWeek.has(0), true);
  const runs = nextCronRuns("0 9 * * 1", {
    date: civilDate(2027, 1, 1),
    hour: 9,
    minute: 0,
  }, 2);
  assert.deepEqual(runs.map((run) => iso(run.date)), [
    "2027-01-04",
    "2027-01-11",
  ]);
  assert.throws(() => parseCron("@daily"));
});

test("Excel serial, FILETIME and JDN conversions handle epoch edges", () => {
  assert.equal(iso(excelSerialToDate(1)), "1900-01-01");
  assert.throws(() => excelSerialToDate(60));
  assert.equal(iso(excelSerialToDate(61)), "1900-03-01");
  assert.equal(dateToExcelSerial(civilDate(1900, 3, 1)), 61);
  assert.equal(iso(filetimeToDate(116444736000000000n)), "1970-01-01");
  assert.equal(iso(filetimeToDate(116444735999999999n)), "1969-12-31");
  assert.equal(civilDateToISODate(civilDate(2027, 1, 1)), "2027-01-01");
  assert.deepEqual(civilDateToISOWeekDate(civilDate(2027, 1, 1)), {
    weekYear: 2026,
    week: 53,
    weekday: 5,
  });
  assert.deepEqual(civilDateToOrdinalDate(civilDate(2024, 12, 31)), {
    year: 2024,
    day: 366,
  });
  assert.equal(formatOrdinalDate(civilDate(2024, 12, 31)), "2024-366");
  assert.equal(iso(parseOrdinalDate("2024-366")), "2024-12-31");
  assert.equal(iso(ordinalDateToCivilDate(2024, 60)), "2024-02-29");
  assert.throws(() => parseOrdinalDate("2023-366"));
  assert.equal(
    iso(fromJulianDayNumber(toJulianDayNumber(civilDate(2024, 2, 29)))),
    "2024-02-29",
  );
});

test("SVG, HTML and ICS exports escape content and use date-only format", () => {
  const svg = renderCalendarSVG({
    year: 2027,
    month: 1,
    title: "<January>",
    events: new Map([["2027-01-01", "New & Year"]]),
  });
  assert.match(svg, /&lt;January&gt;/);
  assert.match(svg, /New &amp; Year/);
  assert.match(
    renderCalendarHTML({
      year: 2027,
      month: 1,
      events: new Map([["2027-01-01", "<safe>"]]),
    }),
    /&lt;safe&gt;/,
  );
  assert.match(
    renderCalendarPrintHTML({ year: 2027, month: 1 }),
    /@media print/,
  );
  assert.match(
    exportCalendarCSV([{
      uid: "event-1",
      start: civilDate(2027, 1, 1),
      title: 'A, "quoted" title',
    }]),
    /"A, ""quoted"" title"/,
  );
  assert.equal(
    JSON.parse(
      exportCalendarJSON([{
        uid: "event-1",
        start: civilDate(2027, 1, 1),
        title: "New Year",
      }]),
    ).events[0].start,
    "2027-01-01",
  );
  const ics = generateICS(
    [{
      uid: "payday-1",
      start: civilDate(2027, 1, 1),
      title: "Pay, day",
    }],
    "CalenWeave",
    new Date("2026-01-02T03:04:05.678Z"),
  );
  assert.match(ics, /DTSTAMP:20260102T030405Z/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270101/);
  assert.match(ics, /SUMMARY:Pay\\, day/);
  assert.match(ics, /\r\nEND:VCALENDAR\r\n$/);
});
