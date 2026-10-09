import type { Commands, ToolRenderer, ToolView } from '@sand/protocol'
import { errorBody, field, truncatedNote } from '@sand/conversation'
import { div, fold, secondaryAction, span } from '@sand/dom'
import { diffCounts, diffLines, type DiffLine } from '@sand/kit'

const shownLines = 160

const lines = (tool: ToolView): DiffLine[] => {
  const input = tool.call.input
  if (tool.call.name === 'write') return field(input, 'content').replace(/\n$/, '').split('\n').map(text => ({ kind: 'add', text }))
  return diffLines(field(input, 'old_string'), field(input, 'new_string'), { context: 2 })
}

const sign = { add: '+', del: '−', ctx: ' ', gap: '⋯' }

const tones = {
  add: { row: 'bg-success-950 text-success-300', sign: 'text-success-300' },
  del: { row: 'bg-danger-950 text-danger-300', sign: 'text-danger-300' },
  ctx: { row: 'text-neutral-400', sign: 'text-neutral-500' },
  gap: { row: 'text-neutral-500', sign: 'text-neutral-500' },
}

const lineRow = (line: DiffLine) =>
  div(
    { class: ['flex min-w-max whitespace-pre pr-3', tones[line.kind].row] },
    span({ class: ['w-6 shrink-0 select-none text-center', tones[line.kind].sign] }, sign[line.kind]),
    span(line.text || ' '),
  )

export type Opener = () => Commands | undefined

const opener = (commands: Opener, tool: ToolView) => {
  const found = commands()
  if (!found?.get('changes') || tool.result?.isError) return undefined
  return secondaryAction({ size: 'sm', class: 'mt-2', onClick: () => void found.run('changes', field(tool.call.input, 'path')) }, 'Open in changes')
}

const view = (commands: Opener) => (tool: ToolView) => {
  const all = lines(tool)
  const shown = all.slice(0, shownLines)
  return div(
    { class: 'font-mono text-xs' },
    tool.result?.isError && div({ class: 'mb-2' }, errorBody(tool)),
    fold({ lines: shown.length }, div({ class: 'overflow-auto rounded-md bg-neutral-950 py-1' }, shown.map(lineRow))),
    all.length > shownLines && truncatedNote(all.length - shownLines, 'after'),
    opener(commands, tool),
  )
}

const meta = (tool: ToolView) => {
  if (tool.result?.isError) return ''
  const { add, del } = diffCounts(lines(tool))
  return [add && `+${add}`, del && `−${del}`].filter(Boolean).join(' ')
}

const replacesAll = (tool: ToolView) => Boolean((tool.call.input as { replace_all?: boolean } | undefined)?.replace_all)

export const editRenderer = (commands: Opener): ToolRenderer => ({
  icon: 'pencil',
  verb: 'Edited',
  activeVerb: 'Editing',
  label: tool => field(tool.call.input, 'path') + (replacesAll(tool) ? ' (all)' : ''),
  meta,
  copy: tool => field(tool.call.input, 'path'),
  body: view(commands),
})

export const writeRenderer = (commands: Opener): ToolRenderer => ({
  ...editRenderer(commands),
  icon: 'file-plus',
  verb: 'Wrote',
  activeVerb: 'Writing',
  label: tool => field(tool.call.input, 'path'),
})
