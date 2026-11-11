import { head } from '@sand/util'
import type { ToolRenderer, ToolView } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { resultText } from '../items/results'
import { toolLabel } from './label'

const clipAt = 8000

const preview = (tool: ToolView) => {
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

const clip = (value: string) => (value.length > clipAt ? `${head(value, clipAt)}\n… ${value.length - clipAt} more characters` : value)

const section = ({ codeBlock, fold }: Kit, body: string, danger = false) => {
  const text = clip(body)
  return fold({ lines: text.split('\n').length, chars: text.length }, codeBlock({ danger }, text))
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
  meta: preview,
  badge: () => undefined,
  copy: toolLabel,
  body: tool => div({ class: 'flex flex-col gap-2' }, section(kit, tool.call.malformed ?? inputText(tool.call.input)), resultSection(kit, tool)),
  actions: () => [],
})
