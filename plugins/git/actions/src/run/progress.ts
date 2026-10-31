import { oneLine } from '@sand/util'
import type { GitAction, GitPhase, GitProgress } from '../contract'
import { plainLine } from './output'

const lineGapMs = 250
const maxLine = 200

export interface Progress {
  phase(phase: GitPhase): void
  line(text: string): void
  stop(): void
}

export interface ProgressPlace {
  cwd: string
  run: string
  action: GitAction
}

export const createProgress = (send: (progress: GitProgress) => void, place: ProgressPlace): Progress => {
  let phase: GitPhase | undefined
  let sentAt = 0
  let pending: string | undefined
  let timer: Timer | undefined

  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
  }

  const flush = () => {
    const line = pending
    timer = undefined
    pending = undefined
    if (!phase || line === undefined) return
    sentAt = Date.now()
    send({ ...place, phase, line })
  }

  return {
    phase(next) {
      cancel()
      phase = next
      sentAt = Date.now()
      send({ ...place, phase: next })
    },
    line(text) {
      const line = oneLine(plainLine(text), maxLine)
      if (!line) return
      pending = line
      if (timer) return
      const wait = sentAt + lineGapMs - Date.now()
      if (wait <= 0) flush()
      else timer = setTimeout(flush, wait)
    },
    stop: cancel,
  }
}
