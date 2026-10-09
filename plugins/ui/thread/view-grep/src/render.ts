import type { ToolRenderer, ToolView } from '@sand/protocol'
import { errorBody, field, resultText, truncatedNote } from '@sand/conversation'
import { div, el, fold, span, type Child } from '@sand/dom'
import { plural } from '@sand/kit'

const shownRows = 200
const match = /^(.*?):(\d+): (.*)$/

const allRows = (tool: ToolView) => resultText(tool.result).split('\n').filter(Boolean)

const rows = (tool: ToolView) => allRows(tool).filter(row => !row.startsWith('…'))

const stopRow = (tool: ToolView) => allRows(tool).find(row => row.startsWith('…'))

const marked = (text: string, pattern: RegExp | undefined): Child[] => {
  if (!pattern) return [text]
  const parts: Child[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    if (!found[0]) break
    parts.push(text.slice(last, found.index), el('mark', { class: 'rounded-sm bg-warning-950 text-warning-400' }, found[0]))
    last = found.index + found[0].length
  }
  return [...parts, text.slice(last)]
}

const regex = (tool: ToolView) => {
  try {
    return new RegExp(field(tool.call.input, 'pattern'), (tool.call.input as { ignore_case?: boolean })?.ignore_case ? 'gi' : 'g')
  } catch {
    return undefined
  }
}

const grouped = (tool: ToolView) => {
  const pattern = regex(tool)
  const files = new Map<string, HTMLElement[]>()
  const loose: HTMLElement[] = []
  for (const row of rows(tool).slice(0, shownRows)) {
    const found = match.exec(row)
    if (!found) {
      loose.push(div({ class: 'mt-2 text-neutral-500 wrap-anywhere' }, row))
      continue
    }
    const list = files.get(found[1]!) ?? []
    list.push(div({ class: 'flex gap-2' }, span({ class: 'min-w-8 shrink-0 text-right text-neutral-500' }, found[2]!), span({ class: 'wrap-anywhere' }, marked(found[3]!, pattern))))
    files.set(found[1]!, list)
  }
  return [...[...files].map(([file, hits]) => div({ class: 'mt-2 first:mt-0' }, div({ class: 'mb-1 text-neutral-300 wrap-anywhere' }, file), hits)), ...loose]
}

const empty = (tool: ToolView) => /^No (matches|files found)$/.test(resultText(tool.result))

const box = (tool: ToolView, content: Child) => {
  const text = resultText(tool.result)
  const hidden = rows(tool).length - shownRows
  const stop = stopRow(tool)
  return div(
    fold({ lines: Math.min(rows(tool).length, shownRows), copy: () => text }, div({ class: 'whitespace-pre-wrap font-mono text-xs text-neutral-400' }, content)),
    hidden > 0 && truncatedNote(hidden, 'after'),
    stop && div({ class: 'mt-1 text-xs text-neutral-500' }, stop),
  )
}

const body = (tool: ToolView, content: () => Child) => {
  if (!tool.result) return undefined
  if (tool.result.isError) return errorBody(tool)
  return box(tool, empty(tool) ? resultText(tool.result) : content())
}

export const grepRenderer: ToolRenderer = {
  icon: 'grep',
  verb: 'Searched',
  activeVerb: 'Searching',
  label(tool) {
    const { input } = tool.call
    const where = [field(input, 'path'), field(input, 'glob')].filter(Boolean).join(' ')
    return `${field(input, 'pattern')}${where ? `  in ${where}` : ''}`
  },
  meta(tool) {
    if (!tool.result || tool.result.isError) return ''
    if (empty(tool)) return 'no matches'
    const count = rows(tool).filter(row => match.test(row)).length
    return count === 1 ? '1 match' : `${count} matches`
  },
  copy: tool => field(tool.call.input, 'pattern'),
  body: tool => body(tool, () => grouped(tool)),
}

export const globRenderer: ToolRenderer = {
  icon: 'search',
  verb: 'Listed',
  activeVerb: 'Listing',
  label: tool => [field(tool.call.input, 'pattern'), field(tool.call.input, 'path')].filter(Boolean).join('  in '),
  meta(tool) {
    if (!tool.result || tool.result.isError) return ''
    if (empty(tool)) return 'no files'
    const count = rows(tool).filter(row => !row.startsWith('…')).length
    return plural(count, 'file')
  },
  copy: tool => field(tool.call.input, 'pattern'),
  body: tool => body(tool, () => el('pre', { class: 'whitespace-pre-wrap wrap-anywhere' }, rows(tool).slice(0, shownRows).join('\n'))),
}
