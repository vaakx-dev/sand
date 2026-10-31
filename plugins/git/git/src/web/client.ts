import type { Wire } from '@sand/devices-contract'
import { collectScope, onInterval } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { gitLocalChange, type GitPlace, gitRemoteChange, type GitStatus, gitStatus, type GitStatusClient, gitWatch } from '../contract'
import { type Followed, placeKey, type StatusListener, withLocal, withRemote } from './followed'

const renewMs = 60_000

export interface StatusClient extends GitStatusClient {
  renew(device?: string): void
  devices(): string[]
}

export const createStatusClient = (ctx: Context, wire: Wire): StatusClient => {
  const followed = new Map<string, Followed>()

  const set = (entry: Followed, status: GitStatus | undefined) => {
    entry.status = status
    for (const listener of [...entry.listeners]) {
      try {
        listener(status)
      } catch (error) {
        ctx.report(error)
      }
    }
  }

  const lease = (entry: Followed) => {
    const asked = entry.version
    wire.call(gitWatch, { cwd: entry.place.cwd }, entry.place.device).then(
      status => {
        if (followed.get(placeKey(entry.place)) !== entry) return
        if (entry.version === asked || !entry.status) set(entry, status)
      },
      () => {},
    )
  }

  const receive = (place: GitPlace, change: (status: GitStatus | undefined) => GitStatus | undefined) => {
    const entry = followed.get(placeKey(place))
    if (!entry) return
    const next = change(entry.status)
    if (!next) return
    entry.version++
    set(entry, next)
  }

  const start = (place: GitPlace) => {
    const entry: Followed = {
      place,
      listeners: new Set(),
      version: 0,
      stopRenewal: collectScope(() =>
        onInterval(() => {
          if (document.visibilityState === 'visible') lease(entry)
        }, renewMs),
      ).value,
    }
    followed.set(placeKey(place), entry)
    lease(entry)
    return entry
  }

  const leave = (entry: Followed, listener: StatusListener) => {
    entry.listeners.delete(listener)
    if (entry.listeners.size || followed.get(placeKey(entry.place)) !== entry) return
    entry.stopRenewal()
    followed.delete(placeKey(entry.place))
  }

  ctx.effect(() => wire.on(gitLocalChange, (change, device) => receive({ device, cwd: change.cwd }, status => withLocal(status, change)), { from: 'all' }))
  ctx.effect(() => wire.on(gitRemoteChange, ({ cwd, remote }, device) => receive({ device, cwd }, status => withRemote(status, remote)), { from: 'all' }))
  ctx.effect(() => () => {
    for (const entry of followed.values()) entry.stopRenewal()
    followed.clear()
  })

  return {
    follow(place, onChange) {
      const entry = followed.get(placeKey(place)) ?? start(place)
      const listener: StatusListener = status => onChange(status)
      entry.listeners.add(listener)
      return () => leave(entry, listener)
    },
    current: place => followed.get(placeKey(place))?.status,
    async refresh(place) {
      const status = await wire.call(gitStatus, { cwd: place.cwd }, place.device)
      receive(place, () => status)
    },
    renew(device) {
      for (const entry of followed.values()) if (!device || entry.place.device === device) lease(entry)
    },
    devices: () => [...new Set([...followed.values()].map(entry => entry.place.device))],
  }
}
