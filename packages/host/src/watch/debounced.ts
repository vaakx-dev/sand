import { existsSync, watch } from 'node:fs'

export interface WatchOptions {
  recursive?: boolean
}

export const debouncedWatch = (path: string, options: WatchOptions, onChange: () => void, ms = 150) => {
  if (!existsSync(path)) return () => {}
  let timer: Timer | undefined
  const watcher = watch(path, { recursive: options.recursive }, () => {
    clearTimeout(timer)
    timer = setTimeout(onChange, ms)
  })
  return () => {
    clearTimeout(timer)
    watcher.close()
  }
}
