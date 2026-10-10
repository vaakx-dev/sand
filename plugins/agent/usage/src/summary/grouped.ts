export const grouped = <T>(map: Map<string, T>, key: string, make: () => T) => {
  const found = map.get(key)
  if (found) return found
  const made = make()
  map.set(key, made)
  return made
}
