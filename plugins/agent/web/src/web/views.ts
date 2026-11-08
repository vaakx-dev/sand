import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import { plural } from '@sand/util'
import { a, div, p } from '@vaakx-dev/vrui'

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
    a({ class: 'block truncate text-neutral-100 no-underline hover:underline', href: url, target: '_blank', rel: 'noopener noreferrer' }, title),
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

const excerptParagraphs = 3

const page = (text: string) => {
  const [head = '', ...rest] = text.split('\n\n')
  const paragraphs = rest.filter(part => part.trim())
  return { title: /^Title: (.*)$/m.exec(head)?.[1], shown: paragraphs.slice(0, excerptParagraphs), hidden: Math.max(0, paragraphs.length - excerptParagraphs) }
}

export const fetchView = (views: ToolViews): ToolRenderer => ({
  icon: 'globe',
  verb: 'Fetched',
  activeVerb: 'Fetching',
  label: tool => views.field(tool.call.input, 'url').replace(/^https?:\/\//, ''),
  meta: () => '',
  copy: tool => views.field(tool.call.input, 'url'),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return views.errorBody(tool)
    const { title, shown, hidden } = page(views.resultText(tool.result))
    return div(
      { class: 'text-sm text-neutral-400' },
      title && div({ class: 'mb-1 font-semibold text-neutral-100' }, title),
      shown.map(part => p({ class: 'mb-2 whitespace-pre-line wrap-anywhere' }, part)),
      hidden > 0 && div({ class: 'text-xs text-neutral-500' }, `${plural(hidden, 'more paragraph')} not shown`),
    )
  },
})
