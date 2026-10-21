export const cached = <T>(build: () => T) => {
  let value: { current: T } | undefined
  return {
    get: () => (value ??= { current: build() }).current,
    reset: () => void (value = undefined),
  }
}
