import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { isRecord } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import { readAtLine } from '../at-line'

type Kind = 'same' | 'add' | 'del'

interface Row {
  kind: Kind
  number: number | undefined
  text: string
}

interface Change {
  path: string
  rows: Row[]
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

const pathView = (path: string, first: boolean) => span({ class: ['px-3 pb-1 text-neutral-200', !first && 'pt-3'], style: { gridColumn: '1 / -1' } }, path)

const changeInputs = (input: unknown): unknown[] => {
  if (!isRecord(input)) return []
  return Array.isArray(input.edits) ? input.edits : [input]
}

export const editRenderer = ({ fold }: Kit, { errorBody, field, resultText }: ToolViews): ToolRenderer => {
  const changes = (tool: ToolView): Change[] => {
    const lines = tool.result ? resultText(tool.result).split('\n') : []
    return changeInputs(tool.call.input).map((change, index) => {
      const path = field(change, 'path')
      const start = lines[index] === undefined ? undefined : readAtLine(lines[index])
      return { path, rows: diffRows(field(change, 'old_string'), field(change, 'new_string'), start) }
    })
  }
  const paths = (tool: ToolView) => [...new Set(changes(tool).map(change => change.path))]
  const count = (tool: ToolView, kind: Kind) =>
    changes(tool)
      .flatMap(change => change.rows)
      .filter(row => row.kind === kind).length
  const titledView = ({ path, rows }: Change, index: number) => [pathView(path, index === 0), ...rows.flatMap(rowView)]
  return {
    icon: 'pencil',
    verb: 'Edited',
    activeVerb: 'Editing',
    label: tool => paths(tool).join(', '),
    meta: tool => `+${count(tool, 'add')} −${count(tool, 'del')}`,
    copy: tool => paths(tool).join('\n'),
    body(tool) {
      if (tool.result?.isError) return errorBody(tool)
      const shown = changes(tool)
      const titled = shown.length > 1
      const lines = shown.reduce((total, change) => total + change.rows.length + (titled ? 1 : 0), 0)
      return fold(
        { lines },
        div(
          { class: 'grid overflow-hidden rounded-lg bg-neutral-800 py-2 font-mono text-xs', style: { gridTemplateColumns: 'auto 1fr' } },
          titled ? shown.flatMap(titledView) : shown.flatMap(change => change.rows.flatMap(rowView)),
        ),
      )
    },
  }
}
