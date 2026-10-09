import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

export const locate = (cwd: string, path: string) => resolve(cwd, path)

export const isDirectory = (path: string) =>
  stat(path).then(
    info => info.isDirectory(),
    () => false,
  )

export const readText = async (path: string) => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return file.text()
}
