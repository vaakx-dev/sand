import { plural } from '@sand/kit'
import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript-parts/contract'
import { a, div } from '@vaakx-dev/vrui'

interface ShownHit {
  title: string
  url: string
  snippet: string
}

const hitOf = (block: string): ShownHit[] => {
  const [first = '', second = '', ...rest] = block.split('\n')
  const title = /^\d+\. (.*)$/.exec(first)?.[1]
  const url = second.trim()
  if (!title || !URL.canParse(url)) return []
  const snippet = rest.map(line => line.trim()).join(' ')
  return [{ title, url, snippet }]
}

const hitsOf = (tool: ToolView, views: ToolViews) => views.resultText(tool.result).split('\n\n').flatMap(hitOf)

const hitRow = ({ title, url, snippet }: ShownHit) =>
  div(
    { class: 'min-w-0' },
    a({ class: 'block truncate text-accent-400 no-underline hover:underline', href: url, target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer', title: url }, title),
    div({ class: 'truncate text-neutral-500' }, new URL(url).host),
    snippet && div({ class: 'truncate text-neutral-400' }, snippet),
  )

const hitList = (tool: ToolView, views: ToolViews) => div({ class: 'flex max-h-96 flex-col gap-2 overflow-auto text-xs' }, hitsOf(tool, views).map(hitRow))

const pageTitle = (tool: ToolView, views: ToolViews) => /^Title: (.*)$/m.exec(views.resultText(tool.result))?.[1] ?? ''

const pageBody = (tool: ToolView, views: ToolViews) => views.outputText(views.resultText(tool.result), false)

const finished = (tool: ToolView) => !!tool.result && !tool.result.isError

const bodyOf = (tool: ToolView, views: ToolViews, shown: (tool: ToolView, views: ToolViews) => HTMLElement) => {
  if (!tool.result) return undefined
  return tool.result.isError ? views.errorBody(tool) : shown(tool, views)
}

export const searchRenderer = (views: ToolViews): ToolRenderer => ({
  icon: 'search',
  verb: 'Searched the web for',
  activeVerb: 'Searching the web for',
  label: tool => views.field(tool.call.input, 'query'),
  meta: tool => (finished(tool) ? plural(hitsOf(tool, views).length, 'result') : ''),
  copy: tool => views.field(tool.call.input, 'query'),
  body: tool => bodyOf(tool, views, hitList),
})

export const fetchRenderer = (views: ToolViews): ToolRenderer => ({
  icon: 'globe',
  verb: 'Read',
  activeVerb: 'Reading',
  label: tool => views.field(tool.call.input, 'url'),
  meta: tool => (finished(tool) ? pageTitle(tool, views) : ''),
  copy: tool => views.field(tool.call.input, 'url'),
  body: tool => bodyOf(tool, views, pageBody),
})
