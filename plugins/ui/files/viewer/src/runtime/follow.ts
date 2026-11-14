import { debouncedWatch } from '@sand/util/fs'
import type { Dispose } from 'drydock'
import { basename, dirname } from 'node:path'

const FOLLOWED = 16

const follower = (changed: (path: string) => void) => {
  const watches = new Map<string, Dispose>()
  const stop = (path: string) => {
    watches.get(path)?.()
    watches.delete(path)
  }
  const follow = (path: string) => {
    const known = watches.get(path)
    watches.delete(path)
    const name = basename(path)
    watches.set(path, known ?? debouncedWatch(dirname(path), { only: filename => filename === name }, () => changed(path)))
    for (const oldest of [...watches.keys()].slice(0, Math.max(0, watches.size - FOLLOWED))) stop(oldest)
  }
  const close = () => [...watches.keys()].forEach(stop)
  return { follow, close }
}

export { follower }
