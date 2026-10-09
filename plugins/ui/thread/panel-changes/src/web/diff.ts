import { div, span } from '@sand/dom'
import type { DiffLine } from '@sand/kit'
import type { FileChange } from '../changes/collect'
import { shownLines } from '../changes/lines'

const marks = { add: '+', del: '−', ctx: '' }

const tones = {
  add: { row: 'border-l border-success-500 bg-success-950', mark: 'text-success-400' },
  del: { row: 'border-l border-danger-500 bg-danger-950', mark: 'text-danger-400' },
  ctx: { row: '', mark: 'text-neutral-500' },
}

const separator = (text: string) => div({ class: 'flex h-6 items-center justify-center bg-neutral-900 text-xs text-neutral-500' }, text)

const lineNode = (line: DiffLine) =>
  line.kind === 'gap'
    ? separator(line.text)
    : div(
        { class: ['flex font-mono text-xs text-neutral-300', tones[line.kind].row] },
        span({ class: ['w-8 shrink-0 select-none text-center', tones[line.kind].mark] }, marks[line.kind]),
        span({ class: 'min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere pl-1 pr-3' }, line.text || ' '),
      )

export const diffNodes = (file: FileChange) => shownLines(file).map(lineNode)
