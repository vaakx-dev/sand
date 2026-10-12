import type { ToolBadge, ToolRenderer, ToolView } from '../contract'
import { div, fold, statusLabel } from '@sand/dom'
import { resultText } from '../thread/results'
import { toolLabel } from './label'
import { outputText } from './notes'

const clipAt = 8000

const preview = (tool: ToolView) => {
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

const failedBadge = (tool: ToolView): ToolBadge | undefined => (tool.status === 'failed' ? { text: statusLabel('failed'), tone: 'danger' } : undefined)

const clip = (value: string) => (value.length > clipAt ? `${value.slice(0, clipAt)}\n… ${value.length - clipAt} more characters` : value)

const section = (title: string, body: string, error = false) => {
  const text = clip(body)
  return div(
    div({ class: 'mb-1 text-xs font-medium text-neutral-500' }, title),
    fold({ lines: text.split('\n').length, chars: text.length, copy: () => body }, outputText(text, error)),
  )
}

const resultSection = (tool: ToolView) => {
  if (!tool.result) return undefined
  const error = Boolean(tool.result.isError)
  return section(error ? 'Error' : 'Output', resultText(tool.result) || 'No output', error)
}

export const genericRenderer = (name: string): Required<ToolRenderer> => ({
  icon: 'wrench',
  verb: name,
  activeVerb: name,
  label: toolLabel,
  meta: preview,
  badge: failedBadge,
  copy: toolLabel,
  body: tool => div({ class: 'flex flex-col gap-3' }, section('Input', tool.call.malformed ?? inputText(tool.call.input)), resultSection(tool)),
  actions: () => [],
})
