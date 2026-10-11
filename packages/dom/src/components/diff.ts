import type { DiffLine } from '@sand/kit'
import { div, span } from '@vaakx-dev/vrui'

type Kind = DiffLine['kind']
type Tone = { row: string; mark: string }

type Look = {
  row: string
  mark: string
  text: string
  marks: Record<Kind, string>
  tones: Record<Kind, Tone>
}

const panel: Look = {
  row: 'flex font-mono text-xs text-neutral-300',
  mark: 'w-8 shrink-0 select-none text-center',
  text: 'min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere pl-1 pr-3',
  marks: { add: '+', del: '−', ctx: '', gap: '' },
  tones: {
    add: { row: 'border-l border-success-500 bg-success-950', mark: 'text-success-400' },
    del: { row: 'border-l border-danger-500 bg-danger-950', mark: 'text-danger-400' },
    ctx: { row: '', mark: 'text-neutral-500' },
    gap: { row: '', mark: 'text-neutral-500' },
  },
}

const compact: Look = {
  row: 'flex min-w-max whitespace-pre pr-3',
  mark: 'w-6 shrink-0 select-none text-center',
  text: '',
  marks: { add: '+', del: '−', ctx: ' ', gap: '⋯' },
  tones: {
    add: { row: 'bg-success-950 text-success-300', mark: 'text-success-300' },
    del: { row: 'bg-danger-950 text-danger-300', mark: 'text-danger-300' },
    ctx: { row: 'text-neutral-400', mark: 'text-neutral-500' },
    gap: { row: 'text-neutral-500', mark: 'text-neutral-500' },
  },
}

const separator = (text: string) => div({ class: 'flex h-6 items-center justify-center bg-neutral-900 text-xs text-neutral-500' }, text)

export const diffRow = (line: DiffLine, options: { compact?: boolean } = {}) => {
  const look = options.compact ? compact : panel
  if (line.kind === 'gap' && !options.compact) return separator(line.text)
  const tone = look.tones[line.kind]
  return div(
    { class: [look.row, tone.row] },
    span({ class: [look.mark, tone.mark] }, look.marks[line.kind]),
    span({ class: look.text }, line.text || ' '),
  )
}
