/** Safely coerce unknown API response data to an array. */
export function safeArray<T = unknown>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}
