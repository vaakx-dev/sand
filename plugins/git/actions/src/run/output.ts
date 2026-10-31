import type { GitResult } from '@sand/git/contract'

const tailLines = 40
const ansi = /\x1b\[[0-9;?]*[A-Za-z]/g

export const plainLine = (text: string) => text.replace(ansi, '')

const shownPart = (line: string) => line.split('\r').filter(Boolean).at(-1) ?? ''

export const outputLines = ({ out, err }: GitResult) =>
  `${out}\n${err}`
    .split('\n')
    .map(line => plainLine(shownPart(line)).trimEnd())
    .filter(line => line.trim())

export const outputTail = (result: GitResult) => {
  const tail = outputLines(result).slice(-tailLines).join('\n')
  return tail || undefined
}

export const hasGitError = (result: GitResult) => outputLines(result).some(line => /^(fatal|error):/.test(line.trim()))
