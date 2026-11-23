import { head } from '@sand/util'
import { basename, dirname } from 'node:path'
import { lines, scope } from './ripgrep'

type Output = 'lines' | 'files' | 'count'

interface Query {
  binary: string
  pattern: string
  root: string
  glob: string
  output: Output
  context: number
  ignoreCase?: boolean
  includeIgnored?: boolean
  signal: AbortSignal
}

const outputs = ['lines', 'files', 'count'] as const

const lineNumber = /^\d+/

const isFile = (path: string) =>
  Bun.file(path)
    .stat()
    .then(
      info => info.isFile(),
      () => false,
    )

const outputArgs = (output: Output, context: number) => {
  switch (output) {
    case 'lines':
      return ['--line-number', '--null', ...(context ? ['--context', String(context)] : [])]
    case 'files':
      return ['--files-with-matches']
    case 'count':
      return ['--count', '--null']
  }
}

const matchLine = (line: string) => {
  const [file = '', rest = ''] = line.split('\0')
  const number = lineNumber.exec(rest)?.[0] ?? ''
  const mark = rest[number.length]
  return `${file}:${number}${mark} ${head(rest.slice(number.length + 1).trim(), 300)}`
}

const countLine = (line: string) => line.replace('\0', ': ')

const shown = (output: Output) => {
  switch (output) {
    case 'lines':
      return (line: string) => (line === '--' ? line : matchLine(line))
    case 'files':
      return (line: string) => line
    case 'count':
      return countLine
  }
}

async function* matches({ binary, pattern, root, glob, output, context, ignoreCase, includeIgnored, signal }: Query) {
  const single = await isFile(root)
  const args = ['--no-heading', '--with-filename', '--color', 'never', '--max-filesize', '1M', '--engine', 'auto', ...outputArgs(output, context)]
  if (ignoreCase) args.push('--ignore-case')
  if (!single && glob !== '**/*') args.push('--glob', glob)
  args.push(...scope(includeIgnored), '--regexp', pattern)
  if (single) args.push('--', basename(root))
  const show = shown(output)
  for await (const line of lines(binary, args, single ? dirname(root) : root, signal)) yield show(line)
}

export { matches, outputs, type Output }
