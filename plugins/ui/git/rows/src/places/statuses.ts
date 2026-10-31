import type { GitPlace, GitStatusClient } from '@sand/git/contract'
import { batch } from '@vaakx-dev/vrui'
import { placeKey } from './key'
import { placeView, type PlaceEntry, type PlaceView } from './view'

export interface PlaceStatuses {
  sync(places: Map<string, GitPlace>): void
  view(place: GitPlace): PlaceView
  close(): void
}

export const placeStatuses = (client: GitStatusClient): PlaceStatuses => {
  const entries = new Map<string, PlaceEntry>()
  const follows = new Map<string, () => void>()

  const entryOf = (key: string) => {
    const found = entries.get(key)
    if (found) return found
    const made = placeView()
    entries.set(key, made)
    return made
  }

  const follow = (key: string, place: GitPlace) => {
    const { status } = entryOf(key)
    let live = true
    status.set(client.current(place))
    const stop = client.follow(place, next => {
      if (live) status.set(next)
    })
    follows.set(key, () => {
      live = false
      void stop()
    })
  }

  const unfollow = (key: string) => {
    follows.get(key)?.()
    follows.delete(key)
    entries.get(key)?.status.set(undefined)
  }

  return {
    sync(places) {
      batch(() => {
        for (const key of [...follows.keys()]) if (!places.has(key)) unfollow(key)
        for (const [key, place] of places) if (!follows.has(key)) follow(key, place)
      })
    },
    view: place => entryOf(placeKey(place)).view,
    close() {
      for (const key of [...follows.keys()]) unfollow(key)
      for (const entry of entries.values()) entry.dispose()
      entries.clear()
    },
  }
}
