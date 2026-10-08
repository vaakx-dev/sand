import { span } from '@sand/dom'
import { text } from '../nodes'

type Kind = 'keyword' | 'string' | 'number' | 'comment' | 'add' | 'del' | 'hunk'

const keywords = new Set(
  'abstract as async await break case catch class const continue def default defer del do elif else enum export extends false final finally fn for from func function go if impl implements import in instanceof interface is lambda let loop match mod module mut new nil none None null package pass private protected pub public raise readonly return self Self static struct super switch this throw throws true True False try type typeof undefined use val var void where while with yield'.split(' '),
)

const comments = {
  hash: '#[^\\n]*',
  dash: '--[^\\n]*',
  slash: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/',
}

const languages: Record<keyof typeof comments, string[]> = {
  hash: ['py', 'python', 'sh', 'bash', 'zsh', 'shell', 'console', 'rb', 'ruby', 'yaml', 'yml', 'toml', 'r', 'perl', 'pl', 'make', 'makefile', 'dockerfile', 'ini', 'conf', 'nix', 'elixir', 'ex', 'powershell', 'ps1'],
  dash: ['sql', 'lua', 'haskell', 'hs', 'elm'],
  slash: ['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript', 'json', 'jsonc', 'json5', 'c', 'h', 'cpp', 'cc', 'hpp', 'cs', 'csharp', 'java', 'kt', 'kotlin', 'go', 'rust', 'rs', 'swift', 'scala', 'dart', 'php', 'zig', 'css', 'scss', 'less', 'groovy', 'gradle', 'proto', 'graphql', 'gql', 'sol'],
}

const strings = `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\``
const tail = `|(${strings})|(\\b\\d[\\w.]*)|([A-Za-z_$][\\w$]*)`

const matchers = new Map(
  Object.entries(languages).flatMap(([style, names]) => {
    const matcher = new RegExp(`(${comments[style as keyof typeof comments]})${tail}`, 'g')
    return names.map(name => [name, matcher] as const)
  }),
)

const tones: Record<Kind, string> = {
  keyword: 'text-accent-300',
  string: 'text-success-300',
  number: 'text-orange-300',
  comment: 'italic text-neutral-500',
  add: 'text-success-400',
  del: 'text-danger-400',
  hunk: 'text-accent-400',
}

const token = (kind: Kind, value: string) => span({ class: tones[kind] }, value)

const diffKind = (line: string): Kind | undefined => {
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  if (line.startsWith('@@')) return 'hunk'
  return undefined
}

const codeKind = ([, comment, string, number, word]: RegExpMatchArray): Kind | undefined => {
  if (comment) return 'comment'
  if (string) return 'string'
  if (number) return 'number'
  if (word && keywords.has(word)) return 'keyword'
  return undefined
}

const diff = (code: string) =>
  code.split('\n').flatMap((line, index) => {
    const kind = diffKind(line)
    const node = kind ? token(kind, line) : text(line)
    return index ? [text('\n'), node] : [node]
  })

export const highlight = (code: string, language: string): Node[] => {
  const name = language.toLowerCase()
  if (name === 'diff' || name === 'patch') return diff(code)
  const matcher = matchers.get(name)
  if (!matcher || code.length > 200_000) return [text(code)]
  const nodes: Node[] = []
  let last = 0
  for (const match of code.matchAll(matcher)) {
    const kind = codeKind(match)
    if (!kind) continue
    if (match.index > last) nodes.push(text(code.slice(last, match.index)))
    nodes.push(token(kind, match[0]))
    last = match.index + match[0].length
  }
  if (last < code.length) nodes.push(text(code.slice(last)))
  return nodes
}
