import type { DiffLine, DiffRange } from '@sand/git-diff-view/contract'
import type { PullRef } from '@sand/github/contract'

export interface LinesPrompt {
  label: string
  text: string
}

const signs: Partial<Record<DiffLine['kind'], string>> = { add: '+', del: '-', ctx: ' ' }

const fence = (body: string) => {
  const longest = Math.max(2, ...[...body.matchAll(/`+/g)].map(match => match[0].length))
  return '`'.repeat(longest + 1)
}

export const linesPlace = ({ path, start, end, side }: DiffRange) => {
  const lines = start === end ? String(start) : `${start}-${end}`
  return `${path}:${lines}${side === 'old' ? ' (removed)' : ''}`
}

export const linesPrompt = (pull: PullRef, range: DiffRange, question: string): LinesPrompt => {
  const body = range.lines.map(line => `${signs[line.kind] ?? ' '}${line.text}`).join('\n')
  const ticks = fence(body)
  return {
    label: `Question on ${linesPlace(range)}`,
    text: [`About pull request #${pull.number} (${pull.repo}), ${linesPlace(range)}:`, `${ticks}diff\n${body}\n${ticks}`, question].join('\n\n'),
  }
}
