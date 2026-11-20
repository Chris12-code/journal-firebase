/** A time span. A missing `to` means "still open" and extends indefinitely. */
export interface Interval {
  from: Date;
  to?: Date;
}

const end = (i: Interval): number => i.to?.getTime() ?? Number.POSITIVE_INFINITY;

/** True when `at` lies within [from, to). */
export function contains(i: Interval, at: Date): boolean {
  return i.from.getTime() <= at.getTime() && at.getTime() < end(i);
}

/** True when both spans share a moment. Touching spans (one ends when the other starts) do not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.from.getTime() < end(b) && b.from.getTime() < end(a);
}

/** Length in milliseconds of closed intervals after merging overlaps. */
export function unionLength(intervals: {from: Date; to: Date}[]): number {
  const sorted = intervals
    .map(i => [i.from.getTime(), i.to.getTime()] as const)
    .filter(([f, t]) => t > f)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let curFrom: number | undefined;
  let curTo = 0;
  for (const [f, t] of sorted) {
    if (curFrom === undefined || f > curTo) {
      if (curFrom !== undefined) total += curTo - curFrom;
      curFrom = f;
      curTo = t;
    } else {
      curTo = Math.max(curTo, t);
    }
  }
  if (curFrom !== undefined) total += curTo - curFrom;
  return total;
}

/** Cuts a closed interval to [start, end). Returns undefined when nothing remains. */
export function clip(i: {from: Date; to: Date}, start: Date, endExclusive: Date): {from: Date; to: Date} | undefined {
  const from = Math.max(i.from.getTime(), start.getTime());
  const to = Math.min(i.to.getTime(), endExclusive.getTime());
  return to > from ? {from: new Date(from), to: new Date(to)} : undefined;
}
