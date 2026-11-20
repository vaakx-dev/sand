import { head } from '@sand/util'
import { basename, dirname } from 'node:path'
import { lines, scope } from './ripgrep'

interface Query {
  binary: string
  pattern: string
  root: string
  glob: string
  ignoreCase?: boolean
  includeIgnored?: boolean
  signal: AbortSignal
}

const matchLine = (file: string, line: string, text: string) => `${file}:${line}: ${head(text.trim(), 300)}`

const isFile = (path: string) =>
  Bun.file(path)
    .stat()
    .then(
      info => info.isFile(),
      () => false,
    )

async function* matches({ binary, pattern, root, glob, ignoreCase, includeIgnored, signal }: Query) {
  const single = await isFile(root)
  const args = ['--line-number', '--no-heading', '--with-filename', '--null', '--color', 'never', '--max-filesize', '1M', '--engine', 'auto']
  if (ignoreCase) args.push('--ignore-case')
  if (!single && glob !== '**/*') args.push('--glob', glob)
  args.push(...scope(includeIgnored), '--regexp', pattern)
  if (single) args.push('--', basename(root))
  for await (const line of lines(binary, args, single ? dirname(root) : root, signal)) {
    const [file = '', rest = ''] = line.split('\0')
    const colon = rest.indexOf(':')
    yield matchLine(file, rest.slice(0, colon), rest.slice(colon + 1))
  }
}

export { matches }
