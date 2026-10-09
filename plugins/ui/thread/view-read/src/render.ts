import type { ToolRenderer, ToolView } from '@sand/protocol'
import { errorBody, field, highlight, resultText, truncatedNote } from '@sand/conversation'
import { div, el, fold, img } from '@sand/dom'
import { plural } from '@sand/kit'

const shownLines = 120
const numbered = /^\s*(\d+)\t(.*)$/

const parse = (tool: ToolView) => {
  const rows = resultText(tool.result).split('\n')
  const lines = rows.flatMap(row => {
    const found = numbered.exec(row)
    return found ? [{ number: found[1]!, text: found[2]! }] : []
  })
  return { lines, tail: rows.at(-1)?.startsWith('…') ? rows.at(-1) : undefined }
}

const hiddenNote = (capped: number, tail: string | undefined) => {
  const cut = Number(/\d+/.exec(tail ?? '')?.[0])
  if (tail && Number.isNaN(cut)) return div({ class: 'mt-1 text-neutral-500' }, tail)
  const total = Math.max(capped, 0) + (tail ? cut : 0)
  return total > 0 && truncatedNote(total, 'after')
}

const language = (path: string) => /\.([\w]+)$/.exec(path)?.[1] ?? ''

const media = (tool: ToolView) => tool.result?.content.find(block => block.type !== 'text')

export const readRenderer: ToolRenderer = {
  icon: 'file-text',
  verb: 'Read',
  activeVerb: 'Reading',
  label(tool) {
    const { input } = tool.call
    const offset = field(input, 'offset')
    return field(input, 'path') + (offset ? `:${offset}` : '')
  },
  meta(tool) {
    if (!tool.result || tool.result.isError) return ''
    const found = media(tool)
    if (found) return found.type === 'image' ? 'image' : 'document'
    const count = parse(tool).lines.length
    return plural(count, 'line')
  },
  copy: tool => field(tool.call.input, 'path'),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return errorBody(tool)
    const found = media(tool)
    if (found?.type === 'image') return div(img({ class: 'block max-h-80 max-w-full rounded-md', src: `data:${found.mediaType};base64,${found.data}`, alt: found.name ?? 'image' }))
    if (found) return div({ class: 'font-mono text-xs text-neutral-400' }, found.name ?? 'document')
    const { lines, tail } = parse(tool)
    const shown = lines.slice(0, shownLines)
    const code = highlight(shown.map(line => line.text).join('\n'), language(field(tool.call.input, 'path')))
    return div(
      { class: 'text-xs text-neutral-400' },
      fold(
        { lines: shown.length, copy: () => shown.map(line => line.text).join('\n'), copyLabel: 'Copy text' },
        div(
          { class: 'flex gap-3 overflow-auto font-mono' },
          el('pre', { class: 'shrink-0 select-none text-right text-neutral-500 opacity-75' }, shown.map(line => line.number).join('\n')),
          el('pre', { class: 'text-neutral-300' }, code),
        ),
      ),
      hiddenNote(lines.length - shownLines, tail),
    )
  },
}
