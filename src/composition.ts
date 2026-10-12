/** Small immutable-by-convention calendar document model for combining event layers. @module */
import type { CalendarEvent } from "./exports.ts";
/** Named source of events in a composed calendar. */
export interface CalendarLayer {
  /** Stable layer label. */
  name: string;
  /** Events contributed by this layer. */
  events: readonly CalendarEvent[];
}
/** A titled composition of named event layers. */
export interface CalendarDocument {
  /** Document title used by renderers and exports. */
  title: string;
  /** Ordered layers preserved during flattening. */
  layers: readonly CalendarLayer[];
}
/** Create a calendar document from named layers; events are preserved in stable layer order. */
export function createCalendarDocument(
  title: string,
  layers: readonly CalendarLayer[],
): CalendarDocument {
  if (!title.trim()) throw new RangeError("title must be non-empty");
  const ids = new Set<string>();
  for (const layer of layers) {
    if (!layer.name.trim()) {
      throw new RangeError("layer names must be non-empty");
    }
    for (const event of layer.events) {
      if (ids.has(event.uid)) {
        throw new RangeError(`duplicate event uid: ${event.uid}`);
      }
      ids.add(event.uid);
    }
  }
  return { title, layers: [...layers] };
}
/** Flatten the document into a stable list of events. */
export function calendarDocumentEvents(
  document: CalendarDocument,
): CalendarEvent[] {
  return document.layers.flatMap((layer) => [...layer.events]);
}
/** Group events by civil date in insertion order. */
export function calendarEventsByDate(
  events: readonly CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = `${event.start.year}-${
      String(event.start.month).padStart(2, "0")
    }-${String(event.start.day).padStart(2, "0")}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }
  return grouped;
}
