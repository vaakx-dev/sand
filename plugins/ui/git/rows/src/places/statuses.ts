import { type GitPlace, type GitStatusClient, placeKey } from '@sand/git/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import { placeView, type PlaceEntry, type PlaceView } from './view'

export interface PlaceStatuses {
  sync(places: Map<string, GitPlace>): void
  view(place: GitPlace): PlaceView | undefined
  close(): void
}

interface Followed {
  entry: PlaceEntry
  stop(): void
}

export const placeStatuses = (client: GitStatusClient): PlaceStatuses => {
  const followed = sig<ReadonlyMap<string, Followed>>(new Map())

  const follow = (place: GitPlace): Followed => {
    const entry = placeView()
    let live = true
    const stop = client.follow(place, next => {
      if (live) entry.status.set(next)
    })
    return {
      entry,
      stop() {
        live = false
        void stop()
        entry.dispose()
      },
    }
  }

  const sync = (places: Map<string, GitPlace>) => {
    const before = followed.get()
    const next = new Map<string, Followed>()
    for (const [key, place] of places) next.set(key, before.get(key) ?? follow(place))
    for (const [key, gone] of before) if (!next.has(key)) gone.stop()
    followed.set(next)
  }

  return {
    sync: places => batch(() => sync(places)),
    view: place => followed.get().get(placeKey(place))?.entry.view,
    close() {
      sync(new Map())
    },
  }
}
