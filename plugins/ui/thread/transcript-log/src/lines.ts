import type { ToolView } from '@sand/protocol'
import { resultSections, type Item, type RendererRegistry, type Step } from '@sand/conversation'
import { button, oneLine, span } from '@sand/dom'

export interface Line {
  key: string
  at?: number
  tag: string
  tone: string
  text: string
  markdown?: boolean
  tool?: ToolView
  node?: HTMLElement
}

const active = (step: Step) => (step.kind === 'thinking' ? step.streaming : step.tool.status === 'running' || step.tool.status === 'pending')

const workingLine = (key: string): Line => ({ key, tag: '·', tone: 'dim', text: 'working…' })

const toolLines = (item: Extract<Item, { kind: 'tools' }>): Line[] => {
  const lines = item.steps.map((step): Line => {
    if (step.kind === 'thinking') return { key: step.key, tag: 'think', tone: 'dim', text: oneLine(step.text, 200) }
    return { key: step.key, at: item.end, tag: '', tone: 'dim', text: '', tool: step.tool }
  })
  return item.running && !item.steps.some(active) ? [...lines, workingLine(`working:${item.key}`)] : lines
}

export const loadingLine = (): Line => ({ key: 'loading', tag: '·', tone: 'dim', text: 'loading…' })

export const failedLine = (message: string, retry: () => void): Line => ({
  key: 'failed',
  tag: 'error',
  tone: 'bad',
  text: '',
  node: span(`couldn't load this thread: ${message} · `, button({ type: 'button', class: 'cursor-pointer underline hover:text-neutral-200', onClick: retry }, 'retry')),
})

const results = (text: string) => resultSections(text).join('\n\n')

export const itemLines = (item: Item, registry: RendererRegistry, thread: string): Line[] => {
  switch (item.kind) {
    case 'user': {
      const text = item.parts.map(part => {
        if (part.kind === 'text') return part.text
        if (part.kind === 'skill') return `[skill ${part.name}]`
        return part.kind === 'notification' || part.kind === 'feedback' ? '' : `[${part.block.name ?? part.kind}]`
      })
      return [{ key: item.key, at: item.at, tag: item.steer ? 'steer' : 'you', tone: 'u', text: text.join(' ') }]
    }
    case 'text':
      return [{ key: item.key, at: item.at, tag: 'sand', tone: 'a', text: item.text + (item.streaming ? '▍' : ''), markdown: true }]
    case 'thinking':
      return [{ key: item.key, at: item.at, tag: 'think', tone: 'dim', text: oneLine(item.text, 200) }]
    case 'tools':
      return toolLines(item)
    case 'notification': {
      const { label, status, result } = item.notification
      return [{ key: item.key, at: item.at, tag: 'task', tone: 't', text: `**${label}** · ${status}\n${results(result)}`, markdown: true }]
    }
    case 'report':
      return [{ key: item.key, tag: 'agent', tone: 't', text: `**${item.report.label}**\n${results(item.report.text)}`, markdown: true }]
    case 'notice':
      return [{ key: item.key, tag: '·', tone: item.tone === 'error' ? 'bad' : 'dim', text: item.text }]
    case 'live':
      return [{ key: item.key, tag: '·', tone: 'dim', text: 'thinking…' }]
    case 'custom': {
      const node = registry.entryRenderer(item.entry.type)?.(item.entry, thread)
      return node ? [{ key: item.key, at: item.entry.at, tag: item.entry.type, tone: 'dim', text: '', node }] : []
    }
  }
}
