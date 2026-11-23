import { duration } from '@sand/util'

const TIMED_AFTER_MS = 1000

const ranText = (started: number, now: number) => {
  const ran = now - started
  return ran >= TIMED_AFTER_MS ? duration(ran) : ''
}

export { ranText }
