export interface Timer {
  set(ms: number, run: () => void): void
  clear(): void
}

export const timer = (): Timer => {
  let handle: ReturnType<typeof setTimeout> | undefined

  const clear = () => {
    if (handle !== undefined) clearTimeout(handle)
    handle = undefined
  }

  return {
    set(ms, run) {
      clear()
      handle = setTimeout(() => {
        handle = undefined
        run()
      }, ms)
    },
    clear,
  }
}
