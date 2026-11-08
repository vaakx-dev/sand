import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import { readAtLine } from '../at-line'

type Kind = 'same' | 'add' | 'del'

interface Row {
  kind: Kind
  number: number | undefined
  text: string
}

const tones: Record<Kind, string> = {
  same: 'text-neutral-400',
  add: 'bg-success-500/10 text-success-200',
  del: 'bg-danger-500/10 text-danger-200',
}

const marks: Record<Kind, string> = { same: ' ', add: '+', del: '−' }

const sharedHead = (a: string[], b: string[]) => {
  let count = 0
  while (count < a.length && count < b.length && a[count] === b[count]) count++
  return count
}

const sharedTail = (a: string[], b: string[], head: number) => {
  let count = 0
  while (count < a.length - head && count < b.length - head && a.at(-1 - count) === b.at(-1 - count)) count++
  return count
}

const diffRows = (before: string, after: string, start: number | undefined): Row[] => {
  const old = before.split('\n')
  const next = after.split('\n')
  const head = sharedHead(old, next)
  const tail = sharedTail(old, next, head)
  const at = (offset: number) => (start === undefined ? undefined : start + offset)
  const same = (lines: string[], from: number) => lines.map((text, index) => ({ kind: 'same' as const, number: at(from + index), text }))
  return [
    ...same(old.slice(0, head), 0),
    ...old.slice(head, old.length - tail).map((text, index) => ({ kind: 'del' as const, number: at(head + index), text })),
    ...next.slice(head, next.length - tail).map((text, index) => ({ kind: 'add' as const, number: at(head + index), text })),
    ...same(next.slice(next.length - tail), next.length - tail),
  ]
}

const rowView = ({ kind, number, text }: Row) => [
  span({ class: ['pr-2 pl-3 text-right select-none', tones[kind]] }, number ?? marks[kind]),
  span({ class: ['pr-3 whitespace-pre-wrap wrap-anywhere', tones[kind]] }, text || ' '),
]

export const editRenderer = ({ fold }: Kit, { errorBody, field, resultText }: ToolViews): ToolRenderer => {
  const rows = (tool: ToolView) =>
    diffRows(field(tool.call.input, 'old_string'), field(tool.call.input, 'new_string'), tool.result ? readAtLine(resultText(tool.result)) : undefined)
  const count = (tool: ToolView, kind: Kind) => rows(tool).filter(row => row.kind === kind).length
  return {
    icon: 'pencil',
    verb: 'Edited',
    activeVerb: 'Editing',
    label: tool => field(tool.call.input, 'path'),
    meta: tool => `+${count(tool, 'add')} −${count(tool, 'del')}`,
    copy: tool => field(tool.call.input, 'path'),
    body(tool) {
      if (tool.result?.isError) return errorBody(tool)
      const shown = rows(tool)
      return fold(
        { lines: shown.length },
        div({ class: 'grid overflow-hidden rounded-lg bg-neutral-800 py-2 font-mono text-xs', style: { gridTemplateColumns: 'auto 1fr' } }, shown.map(rowView)),
      )
    },
  }
}
