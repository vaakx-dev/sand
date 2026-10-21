import type { ToolView } from '../contract'
import { oneLine } from '@sand/util'

const summary = (input: unknown) =>
  oneLine(
    typeof input === 'object' && input
      ? Object.values(input).map(value => (typeof value === 'string' ? value : JSON.stringify(value))).join(' ')
      : String(input ?? ''),
    160,
  )

export const toolLabel = (tool: ToolView) => summary(tool.call.input)
