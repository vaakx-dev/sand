import type { KindContext } from '../contract'

export const poll = (minutes: number, { signal, fail }: KindContext, check: () => Promise<void>) => {
  let timer: Timer | undefined
  const run = async () => {
    try {
      await check()
    } catch (error) {
      if (!signal.aborted) fail(error)
    }
    if (!signal.aborted) timer = setTimeout(run, minutes * 60_000)
  }
  signal.addEventListener('abort', () => clearTimeout(timer))
  void run()
}
