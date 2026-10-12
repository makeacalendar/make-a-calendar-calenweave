# CalenWeave SDK

**A modular TypeScript toolkit for date-only calendar generation, business
scheduling, fiscal periods, recurrence, and printable exports.**

CalenWeave uses validated Gregorian civil dates rather than timestamps. Its
calculation modules are deterministic and make no network requests or
runtime-specific filesystem calls.

## Install

```sh
deno add jsr:@makeacalendar/calenweave
npx jsr add @makeacalendar/calenweave
pnpm add jsr:@makeacalendar/calenweave
bunx jsr add @makeacalendar/calenweave
```

The JSR package coordinate is `@makeacalendar/calenweave`.

## Quick start

```ts
import {
  civilDate,
  createMonthGrid,
  formatCivilDate,
} from "@makeacalendar/calenweave/core";
import { countBusinessDays } from "@makeacalendar/calenweave/business";
import { renderCalendarSVG } from "@makeacalendar/calenweave/rendering";

const january = createMonthGrid(2027, 1, 1); // Monday-first, natural 5-week grid
console.log(january[0].map((day) => day ? formatCivilDate(day) : ""));

const workdays = countBusinessDays(
  civilDate(2027, 1, 1),
  civilDate(2027, 1, 31),
);
console.log(workdays);

const svg = renderCalendarSVG({ year: 2027, month: 1, weekStartsOn: 1 });
```

## Modules

| Entry point                      | Purpose                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `@makeacalendar/calenweave/core` | Validated civil dates, arithmetic, ISO week dates, month and year grids         |
| `.../holidays`                   | US federal legal and observed dates                                             |
| `.../business`                   | Configurable weekends, holiday closures, business-day counting and addition     |
| `.../payroll`                    | Weekly, biweekly and semi-monthly nominal dates with optional payday adjustment |
| `.../shifts`                     | Date-anchored binary rotations, including common patterns                       |
| `.../fiscal`                     | NRF-style nearest-Sunday retail fiscal calendars                                |
| `.../recurrence`                 | Bounded daily, weekly and monthly date recurrence                               |
| `.../cron`                       | Numeric five-field cron parsing and bounded next-run search                     |
| `.../converters`                 | Excel serial, Unix millisecond, FILETIME and integer JDN conversions            |
| `.../rendering`                  | Dependency-free SVG and semantic HTML month grids                               |
| `.../exports`                    | RFC 5545 date-only iCalendar events                                             |
| `.../composition`                | Named event layers for calendar documents                                       |

Each module is also exported from the package root. See
[`docs/getting-started.md`](docs/getting-started.md) for examples and
[`docs/architecture.md`](docs/architecture.md) for date semantics.

## Date semantics

`CivilDate` represents a Gregorian calendar label in years 1–9999. It has no
time, UTC offset, locale, or timezone. `addDays` and other calendar operations
never parse a date as an instant. Unix and FILETIME converters are explicitly
instant-oriented, and their date conversion functions discard time-of-day in
UTC.

Federal holiday dates are statutory dates plus the common federal
Saturday-Friday and Sunday-Monday observation rule. Local employer, bank, court,
and state policies may differ. Payroll output is date scheduling only; it does
not calculate wages, taxes, or legal compliance.

## Development

Requires Deno 2.x for the configured quality commands:

```sh
deno task fmt:check
deno task lint
deno task check
deno task test
deno task doc
deno task publish:dry-run
```

Node.js 24 can execute the dependency-free smoke suite with built-in TypeScript
stripping. Cross-runtime support must be considered verified only after the
relevant runtime checks have passed.

## Attribution and related tools

CalenWeave is an independent software project associated with
[Make a Calendar](https://make-a-calendar.com/). The website offers printable
calendars and browser-based date tools; the SDK implements a subset of related
date and scheduling problems as reusable TypeScript APIs. It does not copy
website code or call private services.

## License

MIT. See [LICENSE](LICENSE).
