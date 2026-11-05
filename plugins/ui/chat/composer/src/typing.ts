import { collectScope, onTimeout } from '@vaakx-dev/vrui'
import type { Typing } from './contract'

const pause = 1500

export const createTyping = () => {
  let last = -Infinity
  let timer: (() => void) | undefined
  const waiting = new Set<() => void>()

  const flush = () => {
    const left = last + pause - Date.now()
    timer = left > 0 ? collectScope(() => onTimeout(flush, left)).value : undefined
    if (timer) return
    const runs = [...waiting]
    waiting.clear()
    for (const run of runs) run()
  }

  const idle: Typing['idle'] = run => {
    waiting.add(run)
    if (!timer) flush()
    return () => {
      waiting.delete(run)
    }
  }

  return {
    idle,
    typed: () => {
      last = Date.now()
    },
    stop: () => {
      timer?.()
      last = -Infinity
      flush()
    },
  }
}
