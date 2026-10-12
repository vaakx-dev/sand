export const limited = (most: number) => {
  let active = 0
  const waiting: (() => void)[] = []
  return async <T>(task: () => Promise<T>): Promise<T> => {
    while (active >= most) await new Promise<void>(resolve => waiting.push(resolve))
    active++
    try {
      return await task()
    } finally {
      active--
      waiting.shift()?.()
    }
  }
}
