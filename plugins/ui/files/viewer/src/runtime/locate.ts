import { readdir, stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { located, type Trail } from './history'

interface Where {
  mention: string
  cwd: string
  trail: Trail
}

const SEARCHED_FOLDERS = 4
const SEARCH_ENTRIES = 20_000
const SEARCH_DEPTH = 8
const SKIPPED = new Set(['node_modules', '.git', '.hg', '.svn', 'target', 'dist', 'build', '.venv', '__pycache__'])
const LOCATION = /(?::\d+(?:[:-]\d+)?|#L\d+(?:-L?\d+)?)$/
const CASELESS = process.platform === 'win32'

const fromUrl = (text: string) => {
  try {
    return fileURLToPath(text)
  } catch {
    return text
  }
}

const cleaned = (mention: string) => {
  const trimmed = mention.trim().replace(/^[`'"<]+|[`'">]+$/g, '')
  const path = trimmed.startsWith('file:') ? fromUrl(trimmed) : trimmed
  return path.replace(LOCATION, '')
}

const comparable = (path: string) => {
  const forward = path.replaceAll('\\', '/').replace(/^\.\//, '')
  return CASELESS ? forward.toLowerCase() : forward
}

const endsWith = (path: string, tail: string) => {
  const whole = comparable(path)
  const wanted = comparable(tail)
  return whole === wanted || whole.endsWith(`/${wanted}`)
}

const isFile = async (path: string) => (await stat(path).catch(() => undefined))?.isFile() === true

const firstFile = async (paths: string[]) => {
  for (const path of paths) if (await isFile(path)) return path
  return undefined
}

const anchored = (path: string) => isAbsolute(path) || path.startsWith('~') || /^\/[a-zA-Z](?:\/|$)/.test(path)

const search = async (root: string, tail: string) => {
  let seen = 0
  let level = [root]
  for (let depth = 0; depth < SEARCH_DEPTH && level.length && seen < SEARCH_ENTRIES; depth++) {
    const next: string[] = []
    for (const folder of level) {
      const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
      seen += entries.length
      const found = entries.find(entry => entry.isFile() && endsWith(join(folder, entry.name), tail))
      if (found) return join(folder, found.name)
      next.push(...entries.filter(entry => entry.isDirectory() && !SKIPPED.has(entry.name)).map(entry => join(folder, entry.name)))
    }
    level = next
  }
  return undefined
}

const searched = async (roots: string[], tail: string) => {
  for (const root of roots) {
    const found = await search(root, tail)
    if (found) return found
  }
  return undefined
}

const locate = async ({ mention, cwd, trail }: Where) => {
  const path = cleaned(mention)
  if (!path) return undefined
  if (anchored(path)) return firstFile([located(path, cwd)])
  const named = trail.files.filter(file => endsWith(file, path))
  const direct = await firstFile([located(path, cwd), ...named, ...trail.folders.map(folder => located(path, folder))])
  return direct ?? searched([...trail.folders.slice(0, SEARCHED_FOLDERS), cwd], path)
}

export { cleaned, locate }
