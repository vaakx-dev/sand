import { stat } from 'node:fs/promises'

interface Listed {
  path: string
  size: number
  mtimeMs: number
  stamp: string
}

const findFiles = (folder: string, pattern: string) =>
  Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: folder, absolute: true, onlyFiles: true })).catch((): string[] => [])

const listedOf = async (path: string): Promise<Listed[]> => {
  const found = await stat(path).catch(() => undefined)
  return found ? [{ path, size: found.size, mtimeMs: found.mtimeMs, stamp: `${found.size}:${found.mtimeMs}` }] : []
}

const listFiles = async (folder: string, pattern: string): Promise<Listed[]> => (await Promise.all((await findFiles(folder, pattern)).map(listedOf))).flat()

export { findFiles, listFiles, type Listed }
