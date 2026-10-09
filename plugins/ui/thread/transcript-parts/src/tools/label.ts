import type { ToolView } from '@sand/transcript-chat/contract'
import { oneLine } from '@sand/kit'
import { field } from '../thread/results'

const summary = (input: unknown) =>
  oneLine(
    typeof input === 'object' && input
      ? Object.values(input).map(value => (typeof value === 'string' ? value : JSON.stringify(value))).join(' ')
      : String(input ?? ''),
    160,
  )

export const firstSentence = (text: string) => oneLine(/^[^\n]*?[.!?](?=\s|$)/.exec(text.trim())?.[0] ?? text, 80)

export const toolLabel = (tool: ToolView) => {
  const { input } = tool.call
  return field(input, 'label') || (field(input, 'task') ? firstSentence(field(input, 'task')) : summary(input))
}
