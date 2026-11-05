// The change from the first known week to the last, so a header can say which
// way a series went before anyone reads the axis.
export function firstToLast(values: (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  const first = known[0];
  const last = known.at(-1);
  if (first === undefined || last === undefined || known.length < 2 || first === 0) {
    return null;
  }
  return (last - first) / first;
}

export function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;
}
