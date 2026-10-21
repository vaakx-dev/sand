import type { ToolRenderer, ToolView, ToolViews } from '@sand/chat/contract'
import { plural } from '@sand/util'
import { a, div } from '@vaakx-dev/vrui'

interface Link {
  title: string
  url: string
}

const linkOf = (block: string): Link[] => {
  const [first = '', second = ''] = block.split('\n')
  const title = /^\d+\. (.*)$/.exec(first)?.[1]
  const url = second.trim()
  return title && URL.canParse(url) ? [{ title, url }] : []
}

const done = (tool: ToolView) => !!tool.result && !tool.result.isError

const linkRow = ({ title, url }: Link) =>
  div(
    { class: 'min-w-0' },
    a({ class: 'block truncate text-accent-400 no-underline hover:underline', href: url, target: '_blank', rel: 'noopener noreferrer', title: url }, title),
    div({ class: 'truncate text-neutral-500' }, url),
  )

export const searchView = (views: ToolViews): ToolRenderer => {
  const links = (tool: ToolView) => (done(tool) ? views.resultText(tool.result).split('\n\n').flatMap(linkOf) : [])
  return {
    icon: 'search',
    verb: 'Searched the web for',
    activeVerb: 'Searching the web for',
    label: tool => views.field(tool.call.input, 'query'),
    meta: tool => (done(tool) ? plural(links(tool).length, 'result') : ''),
    copy: tool => views.field(tool.call.input, 'query'),
    body(tool) {
      if (tool.result?.isError) return views.errorBody(tool)
      const rows = links(tool)
      return rows.length ? div({ class: 'flex max-h-96 flex-col gap-2 overflow-auto text-xs' }, rows.map(linkRow)) : undefined
    },
  }
}

export const fetchView = (views: ToolViews): ToolRenderer => ({
  icon: 'link',
  verb: 'Read',
  activeVerb: 'Reading',
  label: tool => views.field(tool.call.input, 'url'),
  meta: tool => (done(tool) ? (/^Title: (.*)$/m.exec(views.resultText(tool.result))?.[1] ?? '') : ''),
  copy: tool => views.field(tool.call.input, 'url'),
  body: tool => (tool.result?.isError ? views.errorBody(tool) : undefined),
})
