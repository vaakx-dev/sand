import type { UpdateChannel } from './contract'

const firstCheck = 20_000
const cleanupAfter = 60_000
const minute = 60_000

const checkEvery: Record<UpdateChannel, number> = {
  dev: 60 * minute,
  nightly: 60 * minute,
  release: 6 * 60 * minute,
}

export const scheduleChecks = (check: () => void, channel: () => UpdateChannel, cleanup?: () => void) => {
  let last = 0
  const due = () => {
    if (Date.now() - last < checkEvery[channel()]) return
    last = Date.now()
    check()
  }
  const first = setTimeout(due, firstCheck)
  const ticks = setInterval(due, minute)
  const later = cleanup ? setTimeout(cleanup, cleanupAfter) : undefined
  return () => {
    clearTimeout(first)
    clearInterval(ticks)
    clearTimeout(later)
  }
}
