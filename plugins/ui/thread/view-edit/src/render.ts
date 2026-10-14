import type { ToolRenderer, ToolView } from '@sand/transcript-parts/contract'
import { diffCounts, diffLines, type DiffLine } from '@sand/kit'
import { div } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

type Ctx = Context<'toolViews' | 'kit'>

const shownLines = 160

const path = ({ toolViews }: Ctx, tool: ToolView) => toolViews.field(tool.call.input, 'path')

const replacesAll = ({ toolViews }: Ctx, tool: ToolView) => toolViews.field(tool.call.input, 'replace_all') === 'true'

const lines = ({ toolViews: { field } }: Ctx, tool: ToolView): DiffLine[] => {
  const input = tool.call.input
  if (tool.call.name === 'write') return field(input, 'content').replace(/\n$/, '').split('\n').map(text => ({ kind: 'add', text }))
  return diffLines(field(input, 'old_string'), field(input, 'new_string'), { context: 2 })
}

const opener = (ctx: Ctx, tool: ToolView) => {
  const { secondaryAction } = ctx.kit
  const { commands } = ctx
  if (!commands?.get('changes') || tool.result?.isError) return undefined
  return secondaryAction({ size: 'sm', class: 'mt-2', onClick: () => void commands.run('changes', path(ctx, tool)) }, 'Open in Edits')
}

const highlighter = (ctx: Ctx, tool: ToolView) => {
  const highlight = ctx.markdown?.highlight
  const language = /\.(\w+)$/.exec(path(ctx, tool))?.[1] ?? ''
  return highlight && ((code: string) => highlight(code, language))
}

const body = (ctx: Ctx) => (tool: ToolView) => {
  const { diffRow, fold } = ctx.kit
  const views = ctx.toolViews
  const all = lines(ctx, tool)
  const shown = all.slice(0, shownLines)
  const highlight = highlighter(ctx, tool)
  return div(
    { class: 'font-mono text-xs leading-5' },
    tool.result?.isError && div({ class: 'mb-2' }, views.errorBody(tool)),
    fold(
      { lines: shown.length },
      div({ class: 'overflow-auto rounded-md bg-neutral-950 py-1' }, div({ class: 'min-w-max' }, shown.map(line => diffRow(line, highlight)))),
    ),
    all.length > shownLines && views.truncatedNote(all.length - shownLines, 'after'),
    opener(ctx, tool),
  )
}

const meta = (ctx: Ctx) => (tool: ToolView) => {
  if (tool.result?.isError) return ''
  const { add, del } = diffCounts(lines(ctx, tool))
  return [add && `+${add}`, del && `−${del}`].filter(Boolean).join(' ')
}

export const editRenderer = (ctx: Ctx): ToolRenderer => ({
  icon: 'pencil',
  verb: 'Edited',
  activeVerb: 'Editing',
  label: tool => path(ctx, tool) + (replacesAll(ctx, tool) ? ' (all)' : ''),
  meta: meta(ctx),
  copy: tool => path(ctx, tool),
  body: body(ctx),
})

export const writeRenderer = (ctx: Ctx): ToolRenderer => ({
  ...editRenderer(ctx),
  icon: 'file-plus',
  verb: 'Wrote',
  activeVerb: 'Writing',
  label: tool => path(ctx, tool),
})
