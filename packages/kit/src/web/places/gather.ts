import { collectScope, onTimeout } from '@vaakx-dev/vrui'
import type { PlaceLoad, PlaceOwner } from './cache'

const gatherMs = 30
const chunk = 200

type LoadMany<T> = (device: string, cwds: string[]) => Promise<Record<string, T>>

interface Waiting<T> {
  resolve(value: T | undefined): void
  reject(error: unknown): void
}

const send = <T>(loadMany: LoadMany<T>, device: string, waiting: Map<string, Waiting<T>>) => {
  const cwds = [...waiting.keys()]
  for (let at = 0; at < cwds.length; at += chunk) {
    const part = cwds.slice(at, at + chunk)
    loadMany(device, part).then(
      found => part.forEach(cwd => waiting.get(cwd)?.resolve(found[cwd])),
      error => part.forEach(cwd => waiting.get(cwd)?.reject(error)),
    )
  }
}

export const gathered = <T>(owner: PlaceOwner, loadMany: LoadMany<T>): PlaceLoad<T> => {
  const queued = new Map<string, Map<string, Waiting<T>>>()
  let stop: (() => void) | undefined
  let live = true
  owner.effect(() => () => {
    live = false
    stop?.()
  })

  const flush = () => {
    stop = undefined
    for (const [device, waiting] of queued) send(loadMany, device, waiting)
    queued.clear()
  }

  return (cwd, device) =>
    new Promise((resolve, reject) => {
      const waiting = queued.get(device) ?? new Map<string, Waiting<T>>()
      queued.set(device, waiting.set(cwd, { resolve, reject }))
      if (live) stop ??= collectScope(() => onTimeout(flush, gatherMs)).value
    })
}
