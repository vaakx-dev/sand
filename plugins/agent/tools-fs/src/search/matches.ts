import { basename, dirname, join } from 'node:path'
import { isDirectory } from '../files'
import { lines, ripgrep, scope } from './ripgrep'
import { walk } from './walk'

const maxSize = 1_000_000

export interface Query {
  pattern: string
  root: string
  glob: string
  ignoreCase?: boolean
  includeIgnored?: boolean
  signal: AbortSignal
}

const format = (file: string, line: number | string, text: string) => `${file}:${line}: ${text.trim().slice(0, 300)}`

async function* withRipgrep(binary: string, { pattern, root, glob, ignoreCase, includeIgnored, signal }: Query) {
  const directory = await isDirectory(root)
  const args = ['--line-number', '--no-heading', '--with-filename', '--null', '--color', 'never', '--max-filesize', '1M', '--engine', 'auto']
  if (ignoreCase) args.push('--ignore-case')
  if (directory && glob !== '**/*') args.push('--glob', glob)
  args.push(...scope(includeIgnored), '--regexp', pattern)
  if (!directory) args.push('--', basename(root))
  for await (const line of lines(binary, args, directory ? root : dirname(root), signal)) {
    const [file = '', rest = ''] = line.split('\0')
    const colon = rest.indexOf(':')
    yield format(file, rest.slice(0, colon), rest.slice(colon + 1))
  }
}

async function* files(root: string, glob: string, includeIgnored?: boolean) {
  if (await isDirectory(root)) {
    for await (const file of walk(glob, root, includeIgnored)) yield { full: join(root, file), shown: file }
  } else {
    yield { full: root, shown: basename(root) }
  }
}

async function* withScan({ pattern, root, glob, ignoreCase, includeIgnored, signal }: Query) {
  const regex = new RegExp(pattern, ignoreCase ? 'i' : '')
  for await (const { full, shown } of files(root, glob, includeIgnored)) {
    signal.throwIfAborted()
    const file = Bun.file(full)
    if (file.size > maxSize) continue
    const text = await file.text()
    if (text.includes('\0')) continue
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (regex.test(line)) yield format(shown, index + 1, line)
    }
  }
}

export const matches = (query: Query) => (ripgrep ? withRipgrep(ripgrep, query) : withScan(query))
