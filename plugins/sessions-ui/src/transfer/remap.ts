const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype

export const remapIds = (value: unknown, ids: Map<string, string>): unknown => {
  if (typeof value === 'string') return ids.get(value) ?? value
  if (Array.isArray(value)) return value.map(item => remapIds(item, ids))
  if (isPlain(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapIds(item, ids)]))
  return value
}
