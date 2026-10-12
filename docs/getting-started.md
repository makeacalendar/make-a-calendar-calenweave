# Getting started

Install with `deno add jsr:@makeacalendar/calenweave`,
`npx jsr add @makeacalendar/calenweave`,
`pnpm add jsr:@makeacalendar/calenweave`, or
`bunx jsr add @makeacalendar/calenweave` after the package is published.

```ts
import {
  civilDate,
  formatCivilDate,
  isoWeek,
} from "@makeacalendar/calenweave/core";
import { countBusinessDays } from "@makeacalendar/calenweave/business";
import { generateWeeklySchedule } from "@makeacalendar/calenweave/payroll";

const newYear = civilDate(2027, 1, 1);
console.log(isoWeek(newYear));
console.log(countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 31)));
const paydays = generateWeeklySchedule(
  newYear,
  newYear,
  civilDate(2027, 1, 31),
  2,
);
console.log(paydays.map(({ payday }) => formatCivilDate(payday)));
```

Use plain `{ year, month, day }` values for dates. Keep Unix timestamps and
timezone-aware event times in separate types at the application boundary.
