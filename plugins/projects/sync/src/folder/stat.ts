import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  )

export const isGitFolder = (folder: string) => exists(join(folder, '.git'))
