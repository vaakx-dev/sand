import { span } from '@sand/dom'
import type { DiffKind } from '@sand/kit'
import { codeText } from './code'
import type { Line } from './rows'
import type { DiffView } from './view'

interface Tone {
  code: string
  gutter: string
}

const tones: Record<DiffKind, Tone> = {
  add: { code: 'bg-success-500/10', gutter: 'bg-success-500/15 text-success-400/70' },
  del: { code: 'bg-danger-500/10', gutter: 'bg-danger-500/15 text-danger-400/70' },
  ctx: { code: '', gutter: 'text-neutral-600' },
  gap: { code: '', gutter: 'text-neutral-600' },
}

const signs: Record<DiffKind, string> = { add: '+', del: '−', ctx: ' ', gap: ' ' }

const numberWidth = 5

const numberText = (number: number | undefined) => (number === undefined ? '' : String(number)).padStart(numberWidth)

const gutterText = (numbers: (number | undefined)[], sign: string) => `${numbers.map(numberText).join('')}  ${sign}`

const isSelected = (line: Line, view: DiffView) => {
  const selected = view.selected()
  return Boolean(selected && line.at >= selected.from && line.at <= selected.to)
}

const gutterTone = (line: Line, view: DiffView) => (isSelected(line, view) ? 'bg-accent-500/25 text-accent-300' : tones[line.kind].gutter)

export const lineCells = (line: Line, numbers: (number | undefined)[], view: DiffView, divider = '') => [
  span({ class: ['shrink-0 cursor-pointer select-none whitespace-pre pr-2', gutterTone(line, view), divider], 'data-at': String(line.at) }, gutterText(numbers, signs[line.kind])),
  span({ class: ['min-w-0 flex-1 pr-3', tones[line.kind].code] }, codeText(line, view.highlight)),
]

export const emptyCells = (divider = '') => [
  span({ class: ['shrink-0 select-none whitespace-pre bg-neutral-900 pr-2', divider] }, gutterText([undefined], ' ')),
  span({ class: 'min-w-0 flex-1 bg-neutral-900' }),
]
