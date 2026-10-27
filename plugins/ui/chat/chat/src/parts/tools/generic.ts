import type { ToolBadge, ToolRenderer, ToolView } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { resultText } from '../thread/results'
import { toolLabel } from './label'
import { outputText } from './notes'

const clipAt = 8000

const preview = ({ statusLabel }: Kit, tool: ToolView) => {
  if (tool.status === 'running') return statusLabel('running')
  if (!tool.result) return tool.call.malformed ? 'malformed input' : ''
  if (tool.result.isError) return ''
  const lines = resultText(tool.result).split('\n')
  return lines.length > 1 ? `${lines.length} lines` : ''
}

const fieldText = (key: string, value: unknown) => {
  if (typeof value !== 'string') return `${key}: ${JSON.stringify(value, null, 2)}`
  return value.includes('\n') ? `${key}:\n${value.replace(/^/gm, '  ')}` : `${key}: ${value}`
}

const inputText = (input: unknown) => {
  if (typeof input !== 'object' || !input || Array.isArray(input)) return JSON.stringify(input, null, 2) ?? ''
  return Object.entries(input)
    .map(([key, value]) => fieldText(key, value))
    .join('\n')
}

const failedBadge = ({ statusLabel }: Kit, tool: ToolView): ToolBadge | undefined => (tool.status === 'failed' ? { text: statusLabel('failed'), tone: 'danger' } : undefined)

const clip = (value: string) => (value.length > clipAt ? `${value.slice(0, clipAt)}\n… ${value.length - clipAt} more characters` : value)

const section = ({ fold }: Kit, body: string, error = false) => {
  const text = clip(body)
  return fold({ lines: text.split('\n').length, chars: text.length }, outputText(text, error))
}

const resultSection = (kit: Kit, tool: ToolView) => {
  if (!tool.result) return undefined
  return section(kit, resultText(tool.result) || 'No output', Boolean(tool.result.isError))
}

export const genericRenderer = (kit: Kit, name: string): Required<ToolRenderer> => ({
  icon: 'wrench',
  verb: name,
  activeVerb: name,
  label: toolLabel,
  meta: tool => preview(kit, tool),
  badge: tool => failedBadge(kit, tool),
  copy: toolLabel,
  body: tool => div({ class: 'flex flex-col gap-3' }, section(kit, tool.call.malformed ?? inputText(tool.call.input)), resultSection(kit, tool)),
  actions: () => [],
})
