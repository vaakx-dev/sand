export type Limit = <T>(work: () => Promise<T>) => Promise<T>

export const createLimit = (most: number): Limit => {
  let running = 0
  const waiting: (() => void)[] = []

  const acquire = async () => {
    if (running < most) {
      running++
      return
    }
    await new Promise<void>(resolve => waiting.push(resolve))
  }

  const release = () => {
    const next = waiting.shift()
    if (next) next()
    else running--
  }

  return async work => {
    await acquire()
    try {
      return await work()
    } finally {
      release()
    }
  }
}
