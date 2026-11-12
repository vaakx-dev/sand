import { textOf, type ToolResultBlock } from '@sand/chats/contract'
import { oneLine } from '@sand/util'

export const resultSummary = (result: ToolResultBlock) => oneLine(textOf(result.content, ' '), 120)
