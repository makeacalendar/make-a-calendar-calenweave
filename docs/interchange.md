# Date conversions and calendar interchange

CalenWeave uses `CivilDate` for a date label and separate APIs for values that
encode an instant or an external day count. A converter's epoch and precision
are part of the data format; do not infer them from the size of a number.

## Civil dates and ISO strings

`civilDate(year, month, day)` validates the Gregorian date. ISO date parsing
uses `YYYY-MM-DD`; it does not parse a time, UTC offset, or locale-specific
slash notation. An application that receives a timestamp must decide which
zone's date it wants before creating a `CivilDate`.

## Excel serials

`excelSerialToDate` and `dateToExcelSerial` implement the Excel 1900 date system
for positive whole-day serials. Excel serial 60 represents the nonexistent
1900-02-29. It is rejected by default; a caller may explicitly choose whether
that phantom maps to February 28 or March 1. The 1904 workbook system and
fractional time-of-day serials are outside this API.

## Unix milliseconds and FILETIME

`unixMillisecondsToDate` treats its number as milliseconds from the Unix epoch
and uses UTC day boundaries. It discards the time of day. The inverse
`dateToUnixMilliseconds` returns midnight UTC in milliseconds, not seconds,
microseconds or nanoseconds.

`filetimeToUnixMilliseconds` converts `bigint` 100-nanosecond ticks from the
1601 FILETIME epoch to Unix milliseconds. Sub-millisecond values are floored,
including negative instants. `filetimeToDate` then returns the UTC civil date.
The SDK does not interpret FILETIME sentinel values such as a zero-valued Active
Directory attribute.

## Ordinal dates and JDN

`civilDateToOrdinalDate` and `ordinalDateToCivilDate` map a year and one-based
day-of-year. Their string form is `YYYY-DDD`; leap years permit day 366. These
are often called ordinal or day-of-year dates and are distinct from Excel
serials.

`toJulianDayNumber` and `fromJulianDayNumber` use integer day numbers for
Gregorian civil dates. The conventional integer JDN boundary is noon UT; this
date-only API returns the standard integer associated with the civil date and
does not represent a time-of-day. The functions do not convert Julian civil
calendar labels, Modified Julian Dates or fractional Julian Dates.

## iCalendar, CSV and JSON

`CalendarEvent` represents an all-day date range. `endExclusive` is the first
date not included, matching iCalendar `DTEND;VALUE=DATE`; a one-day event
therefore ends on the following civil date. `generateICS` escapes text, emits
CRLF line endings, folds long UTF-8 lines, includes an injected or current UTC
`DTSTAMP`, and accepts a stable UID per event. Pass `generatedAt` in tests or
reproducible builds to make the output stable.

The ICS exporter does not emit timed events, time-zone definitions, recurrence
rules, alarms or attendee data. CSV and JSON exports carry the same date-only
event model. Keep instants and time zones in the application layer when the
calendar file needs clock times.
