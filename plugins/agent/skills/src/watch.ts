import type { Watcher } from '@sand/watch/contract'
import type { Dispose } from 'drydock'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'

export const watchRoot = (watcher: Watcher, root: string, onChange: () => void) => {
  let stop: Dispose = () => {}
  const watchRootFolder = () =>
    watcher.debounced(root, { recursive: true }, () => {
      if (!existsSync(root)) start()
      onChange()
    })
  const waitForRoot = () =>
    watcher.debounced(dirname(root), {}, () => {
      if (!existsSync(root)) return
      start()
      onChange()
    })
  const start = () => {
    void stop()
    stop = existsSync(root) ? watchRootFolder() : waitForRoot()
  }
  start()
  return () => void stop()
}
