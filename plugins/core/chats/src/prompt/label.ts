import type { Prompt } from '../contract'
import { oneLine } from '@sand/util'

export const promptLabel = (prompt: Prompt) => {
  const text = typeof prompt === 'string' ? prompt : prompt.map(block => (block.type === 'text' ? block.text : (block.name ?? block.type))).join(' ')
  return oneLine(text).slice(0, 120)
}
