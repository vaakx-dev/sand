import { debouncedWatch } from '@sand/util/fs'
import { join } from 'node:path'

export const watchSandFolder = (folder: string, onChange: () => void) => {
  const sand = join(folder, '.sand')
  let inside = debouncedWatch(sand, {}, onChange)
  const outside = debouncedWatch(folder, { only: name => name === '.sand' }, () => {
    inside()
    inside = debouncedWatch(sand, {}, onChange)
    onChange()
  })
  return () => {
    outside()
    inside()
  }
}
