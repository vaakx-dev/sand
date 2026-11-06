const most = 8
const longMs = 30_000

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

export const limited = async <T>(timeoutMs: number | undefined, work: () => Promise<T>): Promise<T> => {
  if (timeoutMs !== undefined && timeoutMs > longMs) return work()
  await acquire()
  try {
    return await work()
  } finally {
    release()
  }
}
