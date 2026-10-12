# Architecture and supported semantics

CalenWeave separates Gregorian civil labels from instants. Its date engine uses
an integer day number and supports CE years 1–9999. It does not model local
date-times, UTC offsets, daylight-saving transitions, leap seconds, or
historical Gregorian adoption by jurisdiction.

The portable calculation layer is TypeScript ESM with no runtime dependencies.
Rendering returns strings and does not access a browser DOM. Exports require
only standard language APIs. Runtime compatibility claims are not made until CI
checks have run in each runtime.

US holiday rules implement the listed federal holidays and the common federal
observed-date rule. They do not encode state holidays or employer closure
calendars. Payroll functions generate dates only. Retail calendars anchor a
labeled fiscal year to the Sunday nearest February 1 and make the 53rd week
configurable; this is a planning model, not a licensed NRF table.
