import type { Commands } from '@sand/commands/contract'
import type { ToolRenderer, ToolView } from '@sand/transcript-chat/contract'
import type { ToolViews } from '@sand/transcript-parts/contract'
import { div, fold, secondaryAction, span } from '@sand/dom'
import { diffCounts, diffLines, type DiffLine } from '@sand/kit'

const shownLines = 160

const lines = (tool: ToolView, { field }: ToolViews): DiffLine[] => {
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

const opener = (commands: Opener, tool: ToolView, { field }: ToolViews) => {
  const found = commands()
  if (!found?.get('changes') || tool.result?.isError) return undefined
  return secondaryAction({ size: 'sm', class: 'mt-2', onClick: () => void found.run('changes', field(tool.call.input, 'path')) }, 'Open in changes')
}

const view = (commands: Opener, views: ToolViews) => (tool: ToolView) => {
  const all = lines(tool, views)
  const shown = all.slice(0, shownLines)
  return div(
    { class: 'font-mono text-xs' },
    tool.result?.isError && div({ class: 'mb-2' }, views.errorBody(tool)),
    fold({ lines: shown.length }, div({ class: 'overflow-auto rounded-md bg-neutral-950 py-1' }, shown.map(lineRow))),
    all.length > shownLines && views.truncatedNote(all.length - shownLines, 'after'),
    opener(commands, tool, views),
  )
}

const meta = (views: ToolViews) => (tool: ToolView) => {
  if (tool.result?.isError) return ''
  const { add, del } = diffCounts(lines(tool, views))
  return [add && `+${add}`, del && `−${del}`].filter(Boolean).join(' ')
}

const replacesAll = (tool: ToolView) => Boolean((tool.call.input as { replace_all?: boolean } | undefined)?.replace_all)

export const editRenderer = (commands: Opener, views: ToolViews): ToolRenderer => ({
  icon: 'pencil',
  verb: 'Edited',
  activeVerb: 'Editing',
  label: tool => views.field(tool.call.input, 'path') + (replacesAll(tool) ? ' (all)' : ''),
  meta: meta(views),
  copy: tool => views.field(tool.call.input, 'path'),
  body: view(commands, views),
})

export const writeRenderer = (commands: Opener, views: ToolViews): ToolRenderer => ({
  ...editRenderer(commands, views),
  icon: 'file-plus',
  verb: 'Wrote',
  activeVerb: 'Writing',
  label: tool => views.field(tool.call.input, 'path'),
})
