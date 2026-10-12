import type { ImageBlock } from '@sand/messages'
import type { ToolRenderer, ToolView, ToolViews } from '@sand/transcript-parts/contract'
import type { IconName } from '@sand/ui-kit/contract'
import { div, el } from '@vaakx-dev/vrui'

interface Look {
  icon: IconName
  verb: string
  activeVerb: string
  label(tool: ToolView, views: ToolViews): string
  shows?: 'text' | 'image'
}

const field = (key: string) => (tool: ToolView, views: ToolViews) => views.field(tool.call.input, key)

const target = (tool: ToolView, views: ToolViews) => {
  const ref = views.field(tool.call.input, 'ref')
  return ref || `${views.field(tool.call.input, 'x')},${views.field(tool.call.input, 'y')}`
}

const page = (tool: ToolView, views: ToolViews) => (/^Page: (.*)$/m.exec(views.resultText(tool.result))?.[1] ?? '')

export const looks: Record<string, Look> = {
  browser_open: { icon: 'globe', verb: 'Opened', activeVerb: 'Opening', label: field('url') },
  browser_navigate: { icon: 'globe', verb: 'Went', activeVerb: 'Going', label: field('action') },
  browser_snapshot: { icon: 'tree', verb: 'Read page', activeVerb: 'Reading page', label: page, shows: 'text' },
  browser_click: { icon: 'click', verb: 'Clicked', activeVerb: 'Clicking', label: target },
  browser_type: { icon: 'pencil', verb: 'Typed', activeVerb: 'Typing', label: (tool, views) => `"${views.field(tool.call.input, 'text')}" into ${views.field(tool.call.input, 'ref')}` },
  browser_press: { icon: 'command', verb: 'Pressed', activeVerb: 'Pressing', label: field('keys') },
  browser_scroll: { icon: 'down', verb: 'Scrolled', activeVerb: 'Scrolling', label: (tool, views) => views.field(tool.call.input, 'direction') || 'down' },
  browser_wait: { icon: 'clock', verb: 'Waited', activeVerb: 'Waiting', label: (tool, views) => views.field(tool.call.input, 'text') || views.field(tool.call.input, 'gone') },
  browser_screenshot: { icon: 'camera', verb: 'Looked at', activeVerb: 'Looking at', label: page, shows: 'image' },
  browser_console: { icon: 'term', verb: 'Read console', activeVerb: 'Reading console', label: () => '', shows: 'text' },
  browser_eval: { icon: 'term', verb: 'Ran script', activeVerb: 'Running script', label: field('script'), shows: 'text' },
}

const images = (tool: ToolView) => tool.result?.content.filter((block): block is ImageBlock => block.type === 'image') ?? []

const textBody = (tool: ToolView, views: ToolViews) =>
  el('pre', { class: 'max-h-96 overflow-auto whitespace-pre-wrap wrap-anywhere font-mono text-xs text-neutral-400' }, views.resultText(tool.result))

const imageBody = (tool: ToolView, views: ToolViews) =>
  div({ class: 'flex max-h-96 flex-col overflow-auto rounded-md' }, ...images(tool).map(shot => views.image(shot, tool.thread, { class: 'block max-w-full', alt: 'Browser screenshot' })))

export const browserRenderer = (look: Look, views: ToolViews): ToolRenderer => ({
  icon: look.icon,
  verb: look.verb,
  activeVerb: look.activeVerb,
  label: tool => look.label(tool, views),
  meta: tool => (tool.result && !tool.result.isError && !look.shows ? page(tool, views) : ''),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return views.errorBody(tool)
    return look.shows === 'image' ? imageBody(tool, views) : textBody(tool, views)
  },
})
