/** Calendar data exports. ICS output is RFC 5545 date-only all-day events. @module */
import {
  addDays,
  type CivilDate,
  civilDate,
  compareDates,
  formatCivilDate,
} from "./core/civil-date.ts";
/** Date-only event model used by iCalendar, CSV, and JSON exporters. */
export interface CalendarEvent {
  /** Stable unique identifier used in iCalendar output. */
  uid: string;
  /** First included day. */
  start: CivilDate;
  /** Human-readable event title. */
  title: string;
  /** First excluded date; defaults to the day after `start`. */
  endExclusive?: CivilDate;
  /** Optional plain-text event description. */
  description?: string;
}
const icsEscape = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n").replaceAll("\n", "\\n").replaceAll("\r", "\\n");
const compact = (date: CivilDate): string =>
  formatCivilDate(date).replaceAll("-", "");
/** Generate an iCalendar VCALENDAR containing date-only events. Each event requires a stable UID. `generatedAt` supplies the required UTC DTSTAMP value and defaults to the current instant. */
export function generateICS(
  events: readonly CalendarEvent[],
  calendarName = "CalenWeave",
  generatedAt: Date = new Date(),
): string {
  const isoStamp = generatedAt.toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T/.test(isoStamp)) {
    throw new RangeError("generatedAt must use a four-digit UTC year");
  }
  const stamp = isoStamp.slice(0, 19).replaceAll("-", "").replaceAll(":", "") +
    "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Make a Calendar//CalenWeave SDK 0.1.0//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];
  for (const event of events) {
    if (!event.uid.trim()) throw new RangeError("event uid must be non-empty");
    civilDate(event.start.year, event.start.month, event.start.day);
    const safeEnd = event.endExclusive ?? addDays(event.start, 1);
    civilDate(safeEnd.year, safeEnd.month, safeEnd.day);
    if (compareDates(safeEnd, event.start) <= 0) {
      throw new RangeError("event endExclusive must be after its start");
    }
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(event.start)}`,
      `DTEND;VALUE=DATE:${compact(safeEnd)}`,
      `SUMMARY:${icsEscape(event.title)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // Fold long UTF-8 lines at 75 octets, counting code points without splitting surrogate pairs.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
function foldLine(line: string): string {
  let out = "", current = "", bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      out += current + "\r\n ";
      current = "";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  return out + current;
}

/** Export date-only events as RFC-style CSV with a header row and CRLF endings. */
export function exportCalendarCSV(events: readonly CalendarEvent[]): string {
  const quote = (value: string): string => `"${value.replaceAll('"', '""')}"`;
  const rows = [["UID", "Start", "End exclusive", "Title", "Description"]];
  for (const event of events) {
    civilDate(event.start.year, event.start.month, event.start.day);
    if (event.endExclusive) {
      civilDate(
        event.endExclusive.year,
        event.endExclusive.month,
        event.endExclusive.day,
      );
      if (compareDates(event.endExclusive, event.start) <= 0) {
        throw new RangeError("event endExclusive must be after its start");
      }
    }
    rows.push([
      event.uid,
      formatCivilDate(event.start),
      event.endExclusive ? formatCivilDate(event.endExclusive) : "",
      event.title,
      event.description ?? "",
    ]);
  }
  return rows.map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
}

/** Export a stable JSON document containing a named date-only event list. */
export function exportCalendarJSON(
  events: readonly CalendarEvent[],
  calendarName = "CalenWeave",
): string {
  const serialized = events.map((event) => {
    civilDate(event.start.year, event.start.month, event.start.day);
    if (event.endExclusive) {
      civilDate(
        event.endExclusive.year,
        event.endExclusive.month,
        event.endExclusive.day,
      );
      if (compareDates(event.endExclusive, event.start) <= 0) {
        throw new RangeError("event endExclusive must be after its start");
      }
    }
    return {
      uid: event.uid,
      start: formatCivilDate(event.start),
      ...(event.endExclusive
        ? { endExclusive: formatCivilDate(event.endExclusive) }
        : {}),
      title: event.title,
      ...(event.description === undefined
        ? {}
        : { description: event.description }),
    };
  });
  return JSON.stringify({ calendarName, events: serialized }, null, 2);
}
