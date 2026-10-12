# Business dates, payroll and retail periods

Calendar policies usually contain two independent choices: which dates count and
what to do when a result lands on a closed date. CalenWeave keeps both visible
in the call site.

## Count or add business days

`countBusinessDays(start, end, calendar, inclusive)` counts Monday–Friday dates
by default, including both endpoints. Pass `inclusive: false` to count
`(start, end]`. Reverse ranges return the negative of the corresponding count.

```ts
import { civilDate } from "@makeacalendar/calenweave/core";
import { countBusinessDays } from "@makeacalendar/calenweave/business";

const start = civilDate(2027, 1, 1);
const end = civilDate(2027, 1, 31);
const weekdays = countBusinessDays(start, end);
const officeDays = countBusinessDays(start, end, {
  includeUSFederalHolidays: true,
});
```

`addBusinessDays(anchor, offset)` excludes the anchor. Offset `1` returns the
next open date; `-1` returns the previous one. A `BusinessCalendar` can replace
the weekend days, list additional holiday dates, and opt into the modeled US
federal observed dates. State and company calendars belong in the caller's
configuration.

## Payment terms and deadlines

`calculatePaymentDeadline` returns both `rawDueDate` and `dueDate`, so a caller
can see whether its requested movement changed the date. Calendar-day and
business-day terms exclude the issue date by default. Set `includeIssueDate`
when the governing rule counts that date as day one. Month-end terms add the
requested months, then choose the final civil day of that target month.

```ts
import { calculatePaymentDeadline } from "@makeacalendar/calenweave/business";

const result = calculatePaymentDeadline(
  civilDate(2027, 1, 31),
  { kind: "calendar-days", days: 30 },
  { adjustment: "following-business-day" },
);
```

The calculator does not infer what an invoice, contract, or court rule means.
Choose the correct anchor, day type and closed-day adjustment from that policy.

## Payroll dates

`generateWeeklySchedule` steps by seven days per interval week from a stable
anchor. Use `intervalWeeks: 2` for biweekly dates; this differs from two fixed
dates per month. `generateSemiMonthlySchedule` uses two configured day numbers
and clamps a missing day to month end. `generateMonthlySchedule` similarly
clamps a configured payday such as the 31st in shorter months.

Each occurrence keeps its `nominalDate` beside the adjusted `payday`. The
default adjustment is `none`. A requested following/preceding business-day
policy uses the supplied calendar, or a Monday–Friday calendar with US observed
federal holidays when no calendar is supplied. Payroll calculations do not
calculate wages, taxes, labor compliance or employer-specific rules.

## Rotating shifts

`generateShiftRotation` evaluates a repeating boolean mask over an inclusive
range. The anchor is the first mask position and the phase does not restart at
month boundaries. The exported `shiftPatterns` provide 4-on/3-off, 5-on/2-off
and a 14-day 2-2-3 pattern. To offset a crew, change its anchor or use
`phaseOffset`; the result is simply `{ date, working }` pairs. It has no shift
hours, time zone, overtime or statutory-rest model.

## Retail fiscal years

`createRetailFiscalYear(label, pattern)` returns twelve period records for
4-4-5, 4-5-4 or 5-4-4. The label is the calendar year in which the modeled
retail year ends. It starts on the Sunday nearest February 1 of the preceding
year. `fiftyThirdWeek` selects whether an extra week goes to the last or first
period; the default is the last period.

Retail weeks differ from ISO weeks. The algorithm is a planning model, not an
official or licensed NRF calendar. Use the accounting system's documented week
assignment for financial postings and contractual reporting.
