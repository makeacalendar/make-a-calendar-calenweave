/** Date-anchored repeating on/off rotations. The cycle never resets at month or year boundaries. @module */
import {
  addDays,
  type CivilDate,
  compareDates,
  toDayNumber,
} from "./core/civil-date.ts";
/** Date-anchored repeating work/off pattern. */
export interface ShiftRotation {
  /** Civil date at which pattern index zero begins. */
  anchor: CivilDate;
  /** Repeating binary work/off mask. At least one element is required. */
  pattern: readonly boolean[];
  /** Integer added to the cycle index before wrapping. */
  phaseOffset?: number;
  /** Optional label carried by the caller's schedule. */
  name?: string;
}
/** Common repeating patterns. 2-2-3 is expressed as two days on, two off, three on, then two off, two on, three off. */
export const shiftPatterns = {
  fourOnThreeOff: [true, true, true, true, false, false, false],
  fiveOnTwoOff: [true, true, true, true, true, false, false],
  twoTwoThree: [
    true,
    true,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    true,
    true,
    false,
    false,
    false,
  ],
} as const;
/** Generate shift states in an inclusive interval. */
export function generateShiftRotation(
  rotation: ShiftRotation,
  start: CivilDate,
  end: CivilDate,
): Array<{ date: CivilDate; working: boolean }> {
  if (
    !rotation.pattern.length ||
    rotation.pattern.some((v) => typeof v !== "boolean")
  ) throw new RangeError("pattern must be a non-empty boolean mask");
  if (compareDates(start, end) > 0) {
    throw new RangeError("start must not be after end");
  }
  const anchor = toDayNumber(rotation.anchor),
    offset = rotation.phaseOffset ?? 0;
  if (!Number.isInteger(offset)) {
    throw new RangeError("phaseOffset must be an integer");
  }
  const length = rotation.pattern.length;
  const positiveMod = (x: number): number => ((x % length) + length) % length;
  const out = [];
  for (let n = toDayNumber(start); n <= toDayNumber(end); n++) {
    out.push({
      date: addDays(start, n - toDayNumber(start)),
      working: rotation.pattern[positiveMod(n - anchor + offset)],
    });
  }
  return out;
}
