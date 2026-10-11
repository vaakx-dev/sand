import { existsSync, watch } from 'node:fs'

export interface WatchOptions {
  recursive?: boolean
  only?: (filename: string | null) => boolean
}

export const debouncedWatch = (path: string, options: WatchOptions, onChange: () => void, ms = 150) => {
  if (!existsSync(path)) return () => {}
  let timer: Timer | undefined
  const watcher = watch(path, { recursive: options.recursive }, (_, filename) => {
    if (options.only && !options.only(filename)) return
    clearTimeout(timer)
    timer = setTimeout(onChange, ms)
  })
  watcher.on('error', () => {})
  return () => {
    clearTimeout(timer)
    watcher.close()
  }
}
