import type { Prompt } from '@sand/protocol'

export const promptLabel = (prompt: Prompt) => {
  const text = typeof prompt === 'string' ? prompt : prompt.map(block => (block.type === 'text' ? block.text : (block.name ?? block.type))).join(' ')
  return text.replace(/\s+/g, ' ').trim().slice(0, 120)
}
