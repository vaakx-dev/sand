import type { Watcher } from '@sand/watch/contract'
import type { Dispose } from 'drydock'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'

export const watchRoot = (watcher: Watcher, root: string, onChange: () => void) => {
  let stop: Dispose = () => {}
  const start = () => {
    void stop()
    stop = existsSync(root)
      ? watcher.debounced(root, { recursive: true }, () => {
          if (!existsSync(root)) start()
          onChange()
        })
      : watcher.debounced(dirname(root), {}, () => {
          if (!existsSync(root)) return
          start()
          onChange()
        })
  }
  start()
  return () => void stop()
}
