const budget = (ms: number) => {
  const spent = new AbortController()
  let left = ms
  let since = Date.now()
  let waiting = 0
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => spent.abort(), left)

  const pause = () => {
    waiting++
    if (waiting > 1) return
    clearTimeout(timer)
    left -= Date.now() - since
  }

  const resume = () => {
    waiting--
    if (waiting > 0) return
    since = Date.now()
    timer = setTimeout(() => spent.abort(), left)
  }

  const during = async <T>(work: () => Promise<T>) => {
    pause()
    try {
      return await work()
    } finally {
      resume()
    }
  }

  const stop = () => clearTimeout(timer)

  return { signal: spent.signal, during, stop }
}

export { budget }
