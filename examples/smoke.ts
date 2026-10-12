import {
  civilDate,
  countBusinessDays,
  createMonthGrid,
  formatCivilDate,
  generateWeeklySchedule,
  renderCalendarSVG,
  weekday,
} from "../mod.ts";

const january = createMonthGrid(2027, 1, 1);
console.log("January 2027 Monday-first:", january.length, "weeks");
console.log(
  "First Monday:",
  formatCivilDate(
    january.flat().find((day) => day !== null && weekday(day) === 1)!,
  ),
);
console.log(
  "January weekdays:",
  countBusinessDays(civilDate(2027, 1, 1), civilDate(2027, 1, 31)),
);
console.log(
  "Biweekly dates:",
  generateWeeklySchedule(
    civilDate(2027, 1, 1),
    civilDate(2027, 1, 1),
    civilDate(2027, 3, 1),
    2,
  ).length,
);
console.log(
  "SVG chars:",
  renderCalendarSVG({ year: 2027, month: 1, weekStartsOn: 1 }).length,
);
