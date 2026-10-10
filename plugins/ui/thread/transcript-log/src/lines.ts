import type { Item, RendererRegistry, Step, ToolView } from '@sand/transcript-parts/contract'
import { oneLine, plainButton, span } from '@sand/dom'

type UserPart = Extract<Item, { kind: 'user' }>['parts'][number]

export type LineTone = 'user' | 'task' | 'reply' | 'error' | 'dim'

export interface Line {
  key: string
  at?: number
  tag: string
  tone: LineTone
  text: string
  markdown?: boolean
  tool?: ToolView
  node?: HTMLElement
}

type Sections = (text: string) => string[]

const note = (key: string, text: string): Line => ({ key, tag: '·', tone: 'dim', text })

const active = (step: Step) => (step.kind === 'thinking' ? step.streaming : step.tool.status === 'running' || step.tool.status === 'pending')

const toolLines = (item: Extract<Item, { kind: 'tools' }>): Line[] => {
  const lines = item.steps.map((step): Line => {
    if (step.kind === 'thinking') return { key: step.key, tag: 'think', tone: 'dim', text: oneLine(step.text, 200) }
    return { key: step.key, at: item.end, tag: '', tone: 'dim', text: '', tool: step.tool }
  })
  return item.running && !item.steps.some(active) ? [...lines, note(`working:${item.key}`, 'working…')] : lines
}

const partText = (part: UserPart) => {
  if (part.kind === 'text') return part.text
  if (part.kind === 'skill') return `[skill ${part.name}]`
  if (part.kind === 'notification' || part.kind === 'feedback') return ''
  return `[${part.block.name ?? part.kind}]`
}

export const emptyLine = (): Line => note('empty', 'new thread · type below to start')

export const loadingLine = (): Line => note('loading', 'loading…')

export const failedLine = (message: string, retry: () => void): Line => ({
  key: 'failed',
  tag: 'error',
  tone: 'error',
  text: '',
  node: span(`couldn't load this thread: ${message} · `, plainButton({ class: 'underline hover:text-neutral-200', onClick: retry }, 'retry')),
})

export const itemLines = (item: Item, registry: RendererRegistry, thread: string, sections: Sections): Line[] => {
  const results = (text: string) => sections(text).join('\n\n')
  switch (item.kind) {
    case 'user':
      return [{ key: item.key, at: item.at, tag: item.steer ? 'steer' : 'you', tone: 'user', text: item.parts.map(partText).join(' ') }]
    case 'text':
      return [{ key: item.key, at: item.at, tag: 'sand', tone: 'reply', text: item.text + (item.streaming ? '▍' : ''), markdown: true }]
    case 'thinking':
      return [{ key: item.key, at: item.at, tag: 'think', tone: 'dim', text: oneLine(item.text, 200) }]
    case 'tools':
      return toolLines(item)
    case 'notification': {
      const { label, status, result } = item.notification
      return [{ key: item.key, at: item.at, tag: 'task', tone: 'task', text: `**${label}** · ${status}\n${results(result)}`, markdown: true }]
    }
    case 'report':
      return [{ key: item.key, tag: 'agent', tone: 'task', text: `**${item.report.label}**\n${results(item.report.text)}`, markdown: true }]
    case 'notice':
      return [{ key: item.key, tag: '·', tone: item.tone === 'error' ? 'error' : 'dim', text: item.text }]
    case 'live':
      return [note(item.key, 'thinking…')]
    case 'custom': {
      const node = registry.entryRenderer(item.entry.type)?.(item.entry, thread)
      return node ? [{ key: item.key, at: item.entry.at, tag: item.entry.type, tone: 'dim', text: '', node }] : []
    }
  }
}
