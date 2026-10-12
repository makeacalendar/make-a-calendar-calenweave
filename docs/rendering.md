# Calendar rendering and composition

The rendering module turns a month and optional event-label map into strings. It
has no browser dependency, so the same functions can run in a server, worker,
build script or browser bundle.

## Create markup

```ts
import { civilDate, formatCivilDate } from "@makeacalendar/calenweave/core";
import {
  renderCalendarPrintHTML,
  renderCalendarSVG,
} from "@makeacalendar/calenweave/rendering";

const events = new Map([
  [formatCivilDate(civilDate(2027, 1, 1)), "Office closed"],
]);
const svg = renderCalendarSVG({
  year: 2027,
  month: 1,
  weekStartsOn: 1,
  title: "January planning",
  events,
});
const printable = renderCalendarPrintHTML({ year: 2027, month: 1, events });
```

`renderCalendarSVG` returns one accessible SVG with a title and seven-column
grid. `renderCalendarHTML` returns a semantic table fragment with `time`
elements and ISO `datetime` values. `renderCalendarPrintHTML` wraps that table
in a complete HTML document with print styles. Event labels and titles are
escaped before inclusion in markup.

## Layout choices

`weekStartsOn` is Sunday (`0`) by default or Monday (`1`). Natural month grids
use four, five or six rows depending on the month. The core module also exposes
`createFixedSixWeekMonthGrid` for print layouts that need identical row counts.
The grid uses `null` for leading and trailing cells outside the requested month.

The built-in renderers intentionally provide a small, dependency-free visual
baseline. They do not load fonts, images, locale data, holiday names or a PDF
renderer. A host can add its own CSS, colors, translations and print/export
pipeline around the returned markup.

## Layered event data

`composition.createCalendarDocument` combines named event layers and rejects
duplicate event UIDs. `calendarDocumentEvents` flattens the layers in their
original order, while `calendarEventsByDate` groups events by start date.
Composition does not select a locale or resolve conflicting labels
automatically; the caller chooses precedence and display policy before
rendering.

For date-only calendar data, `generateICS`, `exportCalendarCSV` and
`exportCalendarJSON` provide interchange formats. The ICS output represents
all-day events only. Use a separate time-zone-aware event model for meetings
with start times or daylight-saving behavior.
