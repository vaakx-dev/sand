import type { DiffLine, DiffRange } from '@sand/git-diff-view/contract'
import type { PullRef } from '@sand/github/contract'
import type { AgentPrompt } from '@sand/pull-links/contract'
import { fenced, untrusted } from '@sand/pull-links/prompts'

const signs: Partial<Record<DiffLine['kind'], string>> = { add: '+', del: '-', ctx: ' ' }

const linesPlace = ({ path, start, end, side }: DiffRange) => {
  const lines = start === end ? String(start) : `${start}-${end}`
  return `${path}:${lines}${side === 'old' ? ' (removed)' : ''}`
}

export const linesPrompt = (pull: PullRef, range: DiffRange, question: string): AgentPrompt => {
  const body = range.lines.map(line => `${signs[line.kind] ?? ' '}${line.text}`).join('\n')
  return {
    label: `Question on ${linesPlace(range)}`,
    text: [`About pull request #${pull.number} (${pull.repo}), ${linesPlace(range)}. ${untrusted}`, fenced(body, 'diff'), question].join('\n\n'),
  }
}
