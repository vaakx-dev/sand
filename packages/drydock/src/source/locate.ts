import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import type { Source } from './loader'


const isPath = (path: string) => isAbsolute(path) || path.startsWith('.')

const exported = (exports: unknown): string | undefined => {
  if (typeof exports === 'string') return exports
  if (typeof exports !== 'object' || exports === null) return
  const record = exports as Record<string, unknown>
  return exported(record['.'] ?? record.bun ?? record.import ?? record.default)
}

const packageEntry = (dir: string) => {
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return
  const { exports, main } = JSON.parse(readFileSync(manifest, 'utf8'))
  const field = exported(exports) ?? main
  return field ? resolve(dir, field) : undefined
}

export const locate = (path: string, base: string): Source => {
  if (!isPath(path)) {
    const entry = Bun.resolveSync(path, base)
    return { entry, dir: dirname(entry) }
  }
  const full = resolve(base, path)
  if (!statSync(full).isDirectory()) return { entry: Bun.resolveSync(full, base), dir: dirname(full) }
  return { entry: packageEntry(full) ?? Bun.resolveSync(full, base), dir: full }
}
