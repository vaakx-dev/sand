export const lazy = <T>(make: () => T) => {
  let made: { value: T } | undefined
  return () => (made ??= { value: make() }).value
}
