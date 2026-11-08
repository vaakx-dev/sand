import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

export interface SshConfig {
  aliases: string[]
  files: string[]
}

const maxDepth = 16
const globChars = /[*?[]/
const patternChars = /[*?!]/

const directive = (line: string) => {
  const match = /^\s*([A-Za-z]+)\s*(?:=\s*|\s)(.*)$/.exec(line)
  if (!match?.[1] || line.trimStart().startsWith('#')) return undefined
  const args = [...(match[2] ?? '').matchAll(/"([^"]*)"|(\S+)/g)].map(([, quoted, plain]) => quoted ?? plain ?? '')
  return { keyword: match[1].toLowerCase(), args }
}

const expand = (path: string, folder: string) => {
  if (path === '~' || path.startsWith('~/')) return join(homedir(), path.slice(1))
  return isAbsolute(path) ? path : join(folder, path)
}

const matchingFiles = async (pattern: string) => {
  if (!globChars.test(pattern)) return [pattern]
  const parts = pattern.replaceAll('\\', '/').split('/')
  const fixed = parts.findIndex(part => globChars.test(part))
  const base = `${parts.slice(0, fixed).join('/')}/`
  const glob = new Bun.Glob(parts.slice(fixed).join('/'))
  const found = await Array.fromAsync(glob.scan({ cwd: base, onlyFiles: true, absolute: true, dot: true })).catch(() => [])
  return found.sort()
}

export const readSshConfig = async (folder: string, file = join(folder, 'config')): Promise<SshConfig> => {
  const aliases = new Set<string>()
  const files: string[] = []

  const read = async (path: string, depth: number): Promise<void> => {
    if (depth > maxDepth) return
    const text = await Bun.file(path)
      .text()
      .catch(() => undefined)
    if (text === undefined) return
    files.push(path)
    for (const line of text.split(/\r?\n/)) {
      const found = directive(line)
      if (found?.keyword === 'host') for (const name of found.args) if (!patternChars.test(name)) aliases.add(name)
      if (found?.keyword !== 'include') continue
      for (const pattern of found.args) for (const included of await matchingFiles(expand(pattern, folder))) await read(included, depth + 1)
    }
  }

  await read(file, 0)
  return { aliases: [...aliases], files }
}
