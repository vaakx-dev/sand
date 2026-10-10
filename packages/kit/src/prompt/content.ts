import type { Prompt, UserContent } from '@sand/messages'

export const promptContent = (prompt: Prompt): UserContent[] => (typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt)
