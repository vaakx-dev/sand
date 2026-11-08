import { div } from '@vaakx-dev/vrui'
import { pathLabel } from '../heads/text'
import { lineStat } from '../marks/line-stat'
import { diffRow, type Highlight } from './diff'
import type { DiffLine } from './lcs'

const countOf = (lines: DiffLine[], kind: DiffLine['kind']) => lines.filter(line => line.kind === kind).length

export const diffBlock = (path: string, lines: DiffLine[], highlight?: Highlight) =>
  div(
    { class: 'flex min-w-0 flex-col gap-2' },
    div({ class: 'flex min-w-0 items-center justify-between gap-3 font-mono text-xs' }, pathLabel(() => path), lineStat(countOf(lines, 'add'), countOf(lines, 'del'))),
    lines.length > 0
      ? div(
          { class: 'scrollbars-thin overflow-x-auto rounded-md font-mono text-xs leading-relaxed' },
          div({ class: 'w-max min-w-full py-1.5' }, lines.map(line => diffRow(line, highlight))),
        )
      : null,
  )
