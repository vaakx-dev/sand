import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export const isDirectory = (path: string) =>
  stat(path).then(
    info => info.isDirectory(),
    () => false,
  )

export const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  )

export const isGitFolder = (folder: string) => exists(join(folder, '.git'))
