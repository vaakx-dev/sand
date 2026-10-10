import type { NavItem } from '@sand/dom'
import type { Thread } from '@sand/web-client/contract'
import type { Background } from './background'
import { isBack } from './snooze/actions'

export type ItemCache = (thread: Thread, background: Background, build: () => NavItem) => NavItem

export const uncached: ItemCache = (_thread, _background, build) => build()

const keyOf = (thread: Thread, background: Background, epoch: number) => [
  thread.info,
  thread.device,
  thread.running,
  thread.started,
  thread.unread,
  isBack(thread),
  background.count,
  background.since,
  epoch,
]

export const itemCache = (epoch: () => number): ItemCache => {
  const cached = new WeakMap<Thread, { key: unknown[]; item: NavItem }>()
  return (thread, background, build) => {
    const key = keyOf(thread, background, epoch())
    const hit = cached.get(thread)
    if (hit && hit.key.every((value, at) => value === key[at])) return hit.item
    const item = build()
    cached.set(thread, { key, item })
    return item
  }
}
