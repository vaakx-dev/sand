import type { Prompt } from '@sand/messages'
import { oneLine } from '../text/line'

export const promptLabel = (prompt: Prompt) => {
  const text = typeof prompt === 'string' ? prompt : prompt.map(block => (block.type === 'text' ? block.text : (block.name ?? block.type))).join(' ')
  return oneLine(text).slice(0, 120)
}
