import type { Context } from 'drydock'

const pause = 20

export const backfillLater = (ctx: Context, step: () => boolean) => {
  let stopped = false
  let timer: Timer | undefined
  const next = () => {
    if (stopped) return
    try {
      if (step()) timer = setTimeout(next, pause)
    } catch (error) {
      ctx.report(error)
    }
  }
  void ctx.settled().then(next)
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
