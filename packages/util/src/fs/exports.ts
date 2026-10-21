import { readdir } from 'node:fs/promises'
import { join, posix, resolve } from 'node:path'

type Export = [specifier: string, file: string]

const skipped = (name: string) => name.startsWith('.') || name === 'node_modules'

const folders = async (dir: string) =>
  (await readdir(dir, { withFileTypes: true }).catch(() => []))
    .filter(entry => entry.isDirectory() && !skipped(entry.name))
    .map(entry => join(dir, entry.name))

const exportsIn = async (dir: string): Promise<Export[]> => {
  const manifest = Bun.file(join(dir, 'package.json'))
  if (!(await manifest.exists())) return (await Promise.all((await folders(dir)).map(exportsIn))).flat()
  const { name, exports } = await manifest.json()
  if (typeof name !== 'string' || typeof exports !== 'object' || !exports) return []
  return Object.entries(exports)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([key, file]) => [posix.join(name, key), resolve(dir, file)])
}

export const packageExports = async (...roots: string[]) => Object.fromEntries((await Promise.all(roots.map(exportsIn))).flat())

export const pluginContracts = async (builtins: string) =>
  Object.fromEntries(Object.entries(await packageExports(builtins)).filter(([specifier]) => specifier.endsWith('/contract')))
