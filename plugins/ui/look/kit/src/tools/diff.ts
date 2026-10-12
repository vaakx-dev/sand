import type { DiffLine } from '@sand/kit'
import { div, span } from '@vaakx-dev/vrui'

type Kind = DiffLine['kind']

const marks: Record<Kind, string> = { add: '+', del: '−', ctx: ' ', gap: '⋯' }

const tones: Record<Kind, string> = {
  add: 'bg-success-950 text-success-300',
  del: 'bg-danger-950 text-danger-300',
  ctx: 'text-neutral-400',
  gap: 'text-neutral-500',
}

export const diffRow = (line: DiffLine) =>
  div({ class: ['flex min-w-max whitespace-pre pr-3', tones[line.kind]] }, span({ class: 'w-6 shrink-0 select-none text-center' }, marks[line.kind]), span(line.text || ' '))
