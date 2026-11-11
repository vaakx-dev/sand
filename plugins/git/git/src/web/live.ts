import { isPcUnavailable, pcHello, type Wire } from '@sand/devices-contract'
import { owned } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { collectScope, hasScope, onInterval, onTimeout, registerInScope, sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type GitLive, type GitPlace, type GitStatus, gitLocalChange, gitRemoteChange, gitWatch, placeKey } from '../contract'

interface Followed {
  place: GitPlace
  readers: number
  idle?: () => void
}

const renewMs = 2 * 60_000
const idleMs = 5_000

export const liveStatus = (ctx: Context, link: Wire): GitLive => {
  const statuses = sig<ReadonlyMap<string, GitStatus>>(new Map())
  const followed = new Map<string, Followed>()

  const keep = (key: string, status: GitStatus) => statuses.update(all => new Map(all).set(key, status))
  const drop = (key: string) =>
    statuses.update(all => {
      const next = new Map(all)
      next.delete(key)
      return next
    })

  const watch = ({ place }: Followed) => {
    const key = placeKey(place)
    void link.call(gitWatch, { cwd: place.cwd }, place.device).then(
      status => {
        if (followed.has(key)) keep(key, status)
      },
      error => {
        if (!isPcUnavailable(error)) ctx.report(error)
      },
    )
  }

  const release = (key: string) => {
    const entry = followed.get(key)
    if (!entry || --entry.readers > 0) return
    entry.idle = collectScope(() =>
      onTimeout(() => {
        followed.delete(key)
        drop(key)
      }, idleMs),
    ).value
  }

  const hold = (place: GitPlace) => {
    const key = placeKey(place)
    const entry = followed.get(key)
    if (entry) {
      entry.idle?.()
      entry.readers++
    } else {
      const made = { place, readers: 1 }
      followed.set(key, made)
      watch(made)
    }
    registerInScope(() => release(key))
  }

  ctx.effect(() =>
    joinDisposers(
      link.on(
        gitLocalChange,
        ({ cwd, local }, device) => {
          const key = placeKey({ device, cwd })
          if (followed.has(key)) keep(key, { ...statuses.get().get(key), cwd, local })
        },
        { from: 'all' },
      ),
      link.on(
        gitRemoteChange,
        ({ cwd, remote }, device) => {
          const key = placeKey({ device, cwd })
          const status = statuses.get().get(key)
          if (status) keep(key, { ...status, remote })
        },
        { from: 'all' },
      ),
    ),
  )
  ctx.on(pcHello, device => {
    for (const entry of followed.values()) if (entry.place.device === device) watch(entry)
  })
  owned(ctx, () => onInterval(() => followed.forEach(watch), renewMs))
  ctx.effect(() => () => followed.forEach(entry => entry.idle?.()))

  return {
    status(device, cwd) {
      const place = { device, cwd }
      if (hasScope()) untrack(() => hold(place))
      return statuses.get().get(placeKey(place))
    },
  }
}
