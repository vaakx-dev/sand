import type { Markdown } from '@sand/markdown/contract'
import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'

const shownLines = 120
const numbered = /^\s*(\d+)\t(.*)$/

const parse = (tool: ToolView, { resultText }: ToolViews) => {
  const rows = resultText(tool.result).split('\n')
  const lines = rows.flatMap(row => {
    const [, number, text] = numbered.exec(row) ?? []
    return number === undefined ? [] : [{ number, text: text ?? '' }]
  })
  const last = rows.at(-1)
  return { lines, tail: last?.startsWith('…') ? last : undefined }
}

const hiddenNote = ({ metaLine }: Kit, capped: number, tail: string | undefined, views: ToolViews) => {
  const cut = Number(/\d+/.exec(tail ?? '')?.[0])
  if (tail && Number.isNaN(cut)) return div({ class: 'mt-1 flex' }, metaLine(tail))
  const total = Math.max(capped, 0) + (tail ? cut : 0)
  return total > 0 && views.truncatedNote(total, 'after')
}

const language = (path: string) => /\.(\w+)$/.exec(path)?.[1] ?? ''

const media = (tool: ToolView) => tool.result?.content.find(block => block.type !== 'text')

const code = (kit: Kit, tool: ToolView, views: ToolViews, highlight: Markdown['highlight'] | undefined) => {
  const { lines, tail } = parse(tool, views)
  const shown = lines.slice(0, shownLines)
  const text = shown.map(line => line.text).join('\n')
  return div(
    kit.fold(
      { lines: shown.length },
      kit.codeBlock(
        { class: 'flex gap-3 whitespace-pre' },
        span({ class: 'shrink-0 select-none text-right text-neutral-500' }, shown.map(line => line.number).join('\n')),
        span(highlight ? highlight(text, language(views.field(tool.call.input, 'path'))) : text),
      ),
    ),
    hiddenNote(kit, lines.length - shownLines, tail, views),
  )
}

export const readRenderer = (kit: Kit, views: ToolViews, highlight: Markdown['highlight'] | undefined): ToolRenderer => ({
  icon: 'file-text',
  verb: 'Read',
  activeVerb: 'Reading',
  label(tool) {
    const { input } = tool.call
    const offset = views.field(input, 'offset')
    return views.field(input, 'path') + (offset ? `:${offset}` : '')
  },
  meta(tool) {
    if (!tool.result || tool.result.isError) return ''
    const found = media(tool)
    if (found) return found.type === 'image' ? 'image' : 'document'
    return plural(parse(tool, views).lines.length, 'line')
  },
  copy: tool => views.field(tool.call.input, 'path'),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return views.errorBody(tool)
    const found = media(tool)
    if (found?.type === 'image') return div(views.image(found, tool.thread, { class: 'block max-h-80 max-w-full rounded-md', maxHeight: 320 }))
    if (found) return div({ class: 'flex' }, kit.metaLine(found.name ?? 'document'))
    return code(kit, tool, views, highlight)
  },
})
