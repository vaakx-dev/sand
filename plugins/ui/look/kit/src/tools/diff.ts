import type { DiffLine } from './lcs'
import { div, span } from '@vaakx-dev/vrui'

type Kind = DiffLine['kind']

export type Highlight = (code: string) => (Node | string)[]

const marks: Record<Kind, string> = { add: '+', del: '−', ctx: ' ', gap: '⋯' }

const tones: Record<Kind, { code: string; gutter: string }> = {
  add: { code: 'bg-success-500/10', gutter: 'bg-success-500/15 text-success-400/70' },
  del: { code: 'bg-danger-500/10', gutter: 'bg-danger-500/15 text-danger-400/70' },
  ctx: { code: '', gutter: 'text-neutral-500' },
  gap: { code: 'text-neutral-500', gutter: 'text-neutral-500' },
}

const plain: Highlight = code => [code]

export const diffRow = (line: DiffLine, highlight = plain) =>
  div(
    { class: 'flex whitespace-pre text-neutral-100' },
    span({ class: ['w-6 shrink-0 select-none text-center', tones[line.kind].gutter] }, marks[line.kind]),
    span({ class: ['flex-1 pr-3', tones[line.kind].code] }, line.kind === 'gap' ? line.text || ' ' : highlight(line.text || ' ')),
  )
