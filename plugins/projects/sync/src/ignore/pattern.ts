export interface IgnoreRule {
  negate: boolean
  dirOnly: boolean
  anchored: boolean
  regex: RegExp
}

const escapeChar = (char: string) => char.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

const escapeInClass = (char: string) => (/[\\\][^]/.test(char) ? `\\${char}` : char)

const classAt = (glob: string, start: number) => {
  let index = start + 1
  const negate = glob[index] === '!' || glob[index] === '^'
  if (negate) index++
  let body = ''
  for (let first = true; index < glob.length; index++, first = false) {
    const char = glob[index] ?? ''
    if (char === ']' && !first) return { source: negate ? `[^/${body}]` : `[${body}]`, end: index }
    if (char === '\\' && index + 1 < glob.length) body += escapeInClass(glob[++index] ?? '')
    else body += char === '-' ? char : escapeInClass(char)
  }
  return undefined
}

const doubleStar = (glob: string, index: number) => {
  if (glob[index + 1] !== '*') return undefined
  const fromStart = index === 0 || glob[index - 1] === '/'
  const toEnd = index + 2 === glob.length || glob[index + 2] === '/'
  if (!fromStart || !toEnd) return undefined
  return index + 2 === glob.length ? { source: '.*', end: index + 1 } : { source: '(?:.*/)?', end: index + 2 }
}

const tokenAt = (glob: string, index: number) => {
  const char = glob[index] ?? ''
  const special = (char === '*' && doubleStar(glob, index)) || (char === '[' && classAt(glob, index))
  if (special) return special
  if (char === '*') return { source: '[^/]*', end: index }
  if (char === '?') return { source: '[^/]', end: index }
  if (char === '\\' && index + 1 < glob.length) return { source: escapeChar(glob[index + 1] ?? ''), end: index + 1 }
  return { source: escapeChar(char), end: index }
}

const caseFlags = process.platform === 'win32' || process.platform === 'darwin' ? 'i' : ''

const globRegex = (glob: string) => {
  let source = ''
  for (let index = 0; index < glob.length; index++) {
    const token = tokenAt(glob, index)
    source += token.source
    index = token.end
  }
  return new RegExp(`^${source}$`, caseFlags)
}

const parseLine = (raw: string): IgnoreRule | undefined => {
  let line = raw.replace(/\r$/, '').replace(/(?<!\\) +$/, '')
  if (!line || line.startsWith('#')) return undefined
  const negate = line.startsWith('!')
  if (negate) line = line.slice(1)
  const dirOnly = line.endsWith('/')
  if (dirOnly) line = line.slice(0, -1)
  const anchored = line.includes('/')
  if (line.startsWith('/')) line = line.slice(1)
  if (!line) return undefined
  return { negate, dirOnly, anchored, regex: globRegex(line) }
}

export const parseIgnore = (text: string) => text.split('\n').flatMap(line => parseLine(line) ?? [])
