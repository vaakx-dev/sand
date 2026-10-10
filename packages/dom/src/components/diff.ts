import type { DiffLine } from '@sand/kit'
import { div, span } from '@vaakx-dev/vrui'

const marks = { add: '+', del: '−', ctx: '' }

const tones = {
  add: { row: 'border-l border-success-500 bg-success-950', mark: 'text-success-400' },
  del: { row: 'border-l border-danger-500 bg-danger-950', mark: 'text-danger-400' },
  ctx: { row: '', mark: 'text-neutral-500' },
}

const separator = (text: string) => div({ class: 'flex h-6 items-center justify-center bg-neutral-900 text-xs text-neutral-500' }, text)

export const diffRow = (line: DiffLine) => {
  if (line.kind === 'gap') return separator(line.text)
  const tone = tones[line.kind]
  return div(
    { class: ['flex font-mono text-xs text-neutral-300', tone.row] },
    span({ class: ['w-8 shrink-0 select-none text-center', tone.mark] }, marks[line.kind]),
    span({ class: 'min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere pl-1 pr-3' }, line.text || ' '),
  )
}
