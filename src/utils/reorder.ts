/**
 * Returns a new array with item moved from fromIndex to toIndex.
 */
export function arrayReorder<T>(
  list: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (fromIndex === toIndex) return list.slice();
  const result = list.slice();
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
