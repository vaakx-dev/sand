import type { GitPlace } from '@sand/git/contract'
import type { Threads } from '@sand/web-client/contract'

export const placeOf = (threads: Threads): GitPlace | undefined => {
  const chat = threads.current()
  const cwd = threads.cwd()
  const quick = chat ? chat.info.kind === 'quick' : !cwd
  return quick || !cwd ? undefined : { cwd, device: threads.device() }
}

export const samePlace = (a: GitPlace | undefined, b: GitPlace | undefined) => a?.cwd === b?.cwd && a?.device === b?.device

export const placeKey = (place: GitPlace) => `${place.device}\u0000${place.cwd}`
