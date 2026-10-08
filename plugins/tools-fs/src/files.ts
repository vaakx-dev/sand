import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const ignored = /(^|[\\/])(node_modules|\.git)([\\/]|$)/

export const locate = (cwd: string, path: string) => resolve(cwd, path)

export const isDirectory = (path: string) =>
  stat(path).then(
    info => info.isDirectory(),
    () => false,
  )

export async function* walk(pattern: string, cwd: string) {
  for await (const path of new Bun.Glob(pattern).scan({ cwd, onlyFiles: true, dot: true })) {
    if (!ignored.test(path)) yield path
  }
}

export const readText = async (path: string) => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return file.text()
}
