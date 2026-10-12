/** Dependency-free SVG and HTML calendar rendering. Strings are escaped before inclusion in markup. @module */
import { createMonthGrid } from "./core/mod.ts";
/** Inputs shared by SVG, HTML, and print renderers. */
export interface RenderCalendarOptions {
  /** Gregorian year from 1 through 9999. */
  year: number;
  /** Month number from 1 through 12. */
  month: number;
  /** First weekday, Sunday=0 or Monday=1. Defaults to Sunday. */
  weekStartsOn?: 0 | 1;
  /** Optional accessible calendar title. */
  title?: string;
  /** Event labels keyed by `YYYY-MM-DD`. */
  events?: ReadonlyMap<string, string>;
}
const escape = (s: string): string =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
/** Render an accessible, self-contained SVG month. */
export function renderCalendarSVG(options: RenderCalendarOptions): string {
  const grid = createMonthGrid(
      options.year,
      options.month,
      options.weekStartsOn ?? 0,
    ),
    labels = options.weekStartsOn === 1
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const title = options.title ??
    `${options.year}-${String(options.month).padStart(2, "0")}`;
  const cellW = 120,
    cellH = 78,
    width = 7 * cellW,
    height = 84 + grid.length * cellH;
  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${
      escape(title)
    }</title><rect width="100%" height="100%" fill="#fff"/><text x="18" y="32" font-family="sans-serif" font-size="22" font-weight="700">${
      escape(title)
    }</text>`;
  labels.forEach((label, i) => {
    const x = i * cellW;
    svg += `<text x="${
      x + 8
    }" y="68" font-family="sans-serif" font-size="13" font-weight="700">${label}</text>`;
  });
  grid.forEach((week, w) =>
    week.forEach((date, d) => {
      const x = d * cellW, y = 82 + w * cellH;
      svg +=
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="#fff" stroke="#cbd5e1"/>`;
      if (date) {
        svg += `<text x="${x + 8}" y="${
          y + 23
        }" font-family="sans-serif" font-size="16">${date.day}</text>`;
        const label = options.events?.get(
          `${date.year}-${String(date.month).padStart(2, "0")}-${
            String(date.day).padStart(2, "0")
          }`,
        );
        if (label) {
          svg += `<text x="${x + 8}" y="${
            y + 46
          }" font-family="sans-serif" font-size="11">${
            escape(label).slice(0, 80)
          }</text>`;
        }
      }
    })
  );
  return svg + "</svg>";
}
/** Render a semantic HTML table fragment for a month; suitable for embedding in a document. */
export function renderCalendarHTML(options: RenderCalendarOptions): string {
  const grid = createMonthGrid(
      options.year,
      options.month,
      options.weekStartsOn ?? 0,
    ),
    labels = options.weekStartsOn === 1
      ? [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]
      : [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
  const title = options.title ??
    `${options.year}-${String(options.month).padStart(2, "0")}`;
  const head = labels.map((x) => `<th scope="col">${x}</th>`).join("");
  const rows = grid.map((week) =>
    `<tr>${
      week.map((d) => {
        if (!d) return '<td aria-hidden="true"></td>';
        const key = `${d.year}-${String(d.month).padStart(2, "0")}-${
            String(d.day).padStart(2, "0")
          }`,
          event = options.events?.get(key);
        return `<td data-date="${key}"><time datetime="${key}">${d.day}</time>${
          event ? `<span>${escape(event)}</span>` : ""
        }</td>`;
      }).join("")
    }</tr>`
  ).join("");
  return `<table class="calenweave-calendar"><caption>${
    escape(title)
  }</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** Render a complete HTML document with print-friendly page and calendar styles. */
export function renderCalendarPrintHTML(
  options: RenderCalendarOptions,
): string {
  const table = renderCalendarHTML(options);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${
    escape(
      options.title ??
        `${options.year}-${String(options.month).padStart(2, "0")}`,
    )
  }</title><style>body{font-family:system-ui,sans-serif;margin:1rem}table.calenweave-calendar{border-collapse:collapse;width:100%;table-layout:fixed}caption{font-size:1.5rem;font-weight:700;margin:0 0 .75rem}th,td{border:1px solid #64748b;padding:.5rem;vertical-align:top;height:4rem}td span{display:block;overflow-wrap:anywhere}@media print{@page{size:landscape;margin:12mm}body{margin:0}th,td{height:2.4cm;break-inside:avoid}}</style></head><body>${table}</body></html>`;
}
