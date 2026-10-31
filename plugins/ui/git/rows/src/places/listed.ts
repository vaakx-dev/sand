import type { GitPlace } from '@sand/git/contract'
import type { DraftTarget, Thread } from '@sand/web-client/contract'
import { placeKey } from './key'

export const placeLimit = 40

const positionOf = (thread: Thread) => thread.info.position ?? thread.info.created

const asleep = (thread: Thread, now: number) => (thread.info.snoozed ?? 0) > now

const listed = (thread: Thread) => thread.info.kind === 'thread' && !thread.info.settled && Boolean(thread.info.cwd)

const rank = (threads: Thread[], now: number) =>
  threads.filter(listed).sort((a, b) => {
    const sleep = Number(asleep(a, now)) - Number(asleep(b, now))
    if (sleep) return sleep
    const pin = Number(b.info.pinned) - Number(a.info.pinned)
    return pin || positionOf(b) - positionOf(a)
  })

export const listedPlaces = (threads: Thread[], drafts: DraftTarget[], now = Date.now()) => {
  const candidates: GitPlace[] = [
    ...drafts.filter(draft => draft.cwd).map(({ cwd, device }) => ({ cwd, device })),
    ...rank(threads, now).map(thread => ({ cwd: thread.info.cwd, device: thread.device })),
  ]
  const places = new Map<string, GitPlace>()
  for (const place of candidates) {
    if (places.size >= placeLimit) break
    places.set(placeKey(place), place)
  }
  return places
}
