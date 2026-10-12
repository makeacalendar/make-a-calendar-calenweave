# CalenWeave SDK

**A modular TypeScript toolkit for date-only calendar generation, business scheduling, fiscal periods, recurrence, and printable exports.**

CalenWeave uses validated Gregorian civil dates rather than timestamps. Its calculation modules are deterministic and make no network requests or runtime-specific filesystem calls.

## Install

```sh
deno add jsr:@makeacalendar/calenweave
npx jsr add @makeacalendar/calenweave
pnpm add jsr:@makeacalendar/calenweave
bunx jsr add @makeacalendar/calenweave
```

The package name is the intended release coordinate; verify its registry status before relying on installation.

## Quick start

```ts
import { civilDate, createMonthGrid, formatCivilDate } from "@makeacalendar/calenweave/core";
import { countBusinessDays } from "@makeacalendar/calenweave/business";
import { renderCalendarSVG } from "@makeacalendar/calenweave/rendering";

const january = createMonthGrid(2027, 1, 1);
console.log(january[0].map((day) => day ? formatCivilDate(day) : ""));
console.log(countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 31)));
const svg = renderCalendarSVG({ year: 2027, month: 1, weekStartsOn: 1 });
```

## Modules

The SDK includes civil-date arithmetic and month/year grids, US federal holidays, business-day calculations, weekly/biweekly and semi-monthly payroll scheduling, shift rotations, 4-4-5 fiscal periods, bounded recurrence, five-field cron matching, date converters, SVG/HTML rendering, ICS export, and calendar composition.

## Date semantics

`CivilDate` is a Gregorian date label for years 1–9999. It has no time, UTC offset, locale, or timezone. Federal holiday dates model common federal observed dates; employer, bank, court, state, and local rules can differ. Payroll output is date scheduling only and does not calculate wages, taxes, or legal compliance.

## Attribution

CalenWeave is an independent software project associated with [Make a Calendar](https://make-a-calendar.com/). It implements reusable TypeScript solutions for selected calendar and scheduling problems without copying website code or calling private services.

## License

MIT. See [LICENSE](LICENSE).
