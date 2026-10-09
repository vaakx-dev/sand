import { debouncedWatch } from '@sand/host'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'

export const watchRoot = (root: string, onChange: () => void) => {
  let stop = () => {}
  const start = () => {
    stop()
    stop = existsSync(root)
      ? debouncedWatch(root, { recursive: true }, () => {
          if (!existsSync(root)) start()
          onChange()
        })
      : debouncedWatch(dirname(root), {}, () => {
          if (!existsSync(root)) return
          start()
          onChange()
        })
  }
  start()
  return () => stop()
}
