import type { ToolView } from '../contract'
import { inputText } from '@sand/util'

export const toolLabel = (tool: ToolView) => inputText(tool.call.input, 160)
