import type { ToolRenderer, ToolView, ToolViews } from '@sand/chat/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { grouped, plural } from '@sand/util'
import { div, el, span, type Child } from '@vaakx-dev/vrui'

const shownRows = 200
const match = /^(.*?):(\d+): (.*)$/

const marked = (text: string, pattern: RegExp | undefined): Child[] => {
  if (!pattern) return [text]
  const parts: Child[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    if (!found[0]) break
    parts.push(text.slice(last, found.index), el('mark', { class: 'bg-accent-500/25 text-neutral-100' }, found[0]))
    last = found.index + found[0].length
  }
  return [...parts, text.slice(last)]
}

const regex = (tool: ToolView, { field }: ToolViews) => {
  try {
    return new RegExp(field(tool.call.input, 'pattern'), field(tool.call.input, 'ignore_case') === 'true' ? 'gi' : 'g')
  } catch {
    return undefined
  }
}

const output = (tool: ToolView, { resultText }: ToolViews) => {
  const all = resultText(tool.result).split('\n').filter(Boolean)
  return { rows: all.filter(row => !row.startsWith('…')), stop: all.find(row => row.startsWith('…')) }
}

const hitRow = (line: string, text: string, pattern: RegExp | undefined) =>
  div({ class: 'flex gap-2' }, span({ class: 'min-w-8 shrink-0 text-right text-neutral-500' }, line), span({ class: 'wrap-anywhere' }, marked(text, pattern)))

const matches = (tool: ToolView, views: ToolViews) => {
  const pattern = regex(tool, views)
  const files = new Map<string, HTMLElement[]>()
  const loose: HTMLElement[] = []
  for (const row of output(tool, views).rows.slice(0, shownRows)) {
    const found = match.exec(row)
    if (!found) {
      loose.push(div({ class: 'mt-2 text-neutral-500 wrap-anywhere' }, row))
      continue
    }
    const [, file = '', line = '', text = ''] = found
    grouped(files, file, () => []).push(hitRow(line, text, pattern))
  }
  return [...[...files].map(([file, hits]) => div({ class: 'mt-2 first:mt-0' }, div({ class: 'mb-1 text-neutral-100 wrap-anywhere' }, file), hits)), ...loose]
}

const empty = (tool: ToolView, { resultText }: ToolViews) => /^No (matches|files found)$/.test(resultText(tool.result))

const box = ({ fold }: Kit, tool: ToolView, content: Child, views: ToolViews) => {
  const { rows, stop } = output(tool, views)
  const hidden = rows.length - shownRows
  return div(
    fold({ lines: Math.min(rows.length, shownRows) }, views.outputText(content, false)),
    hidden > 0 && views.truncatedNote(hidden, 'after'),
    stop && div({ class: 'mt-1 text-xs text-neutral-500' }, stop),
  )
}

const body = (kit: Kit, tool: ToolView, content: () => Child, none: string, views: ToolViews) => {
  if (!tool.result) return undefined
  if (tool.result.isError) return views.errorBody(tool)
  return box(kit, tool, empty(tool, views) ? none : content(), views)
}

export const grepRenderer = (kit: Kit, views: ToolViews): ToolRenderer => ({
  icon: 'grep',
  verb: 'Searched',
  activeVerb: 'Searching',
  label(tool) {
    const { input } = tool.call
    const where = [views.field(input, 'path'), views.field(input, 'glob')].filter(Boolean).join(' ')
    return `${views.field(input, 'pattern')}${where ? `  in ${where}` : ''}`
  },
  meta(tool) {
    if (!tool.result || tool.result.isError) return ''
    if (empty(tool, views)) return 'no matches'
    const count = output(tool, views).rows.filter(row => match.test(row)).length
    return count === 1 ? '1 match' : `${count} matches`
  },
  copy: tool => views.field(tool.call.input, 'pattern'),
  body: tool => body(kit, tool, () => matches(tool, views), 'No matches', views),
})

export const globRenderer = (kit: Kit, views: ToolViews): ToolRenderer => ({
  icon: 'search',
  verb: 'Listed',
  activeVerb: 'Listing',
  label: tool => [views.field(tool.call.input, 'pattern'), views.field(tool.call.input, 'path')].filter(Boolean).join('  in '),
  meta(tool) {
    if (!tool.result || tool.result.isError) return ''
    if (empty(tool, views)) return 'no files'
    return plural(output(tool, views).rows.length, 'file')
  },
  copy: tool => views.field(tool.call.input, 'pattern'),
  body: tool => body(kit, tool, () => output(tool, views).rows.slice(0, shownRows).join('\n'), 'No files', views),
})
