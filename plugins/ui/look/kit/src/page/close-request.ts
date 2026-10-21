import { listen } from '@vaakx-dev/vrui'

interface CloseWatcher extends EventTarget {
  destroy(): void
}

declare const CloseWatcher: (new () => CloseWatcher) | undefined

export const onCloseRequest = (close: () => void) => {
  if (typeof CloseWatcher !== 'function') return () => {}
  const watcher = new CloseWatcher()
  const stop = listen(watcher, 'close', close)
  return () => {
    stop()
    watcher.destroy()
  }
}
