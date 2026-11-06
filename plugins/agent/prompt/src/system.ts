import type { Conversation } from '@sand/engine/contract'
import type { Instructions } from './instructions'

export const compose = (instructions: Instructions, conversation: Conversation, model: string, base: string[], own: string[]) =>
  [...base, ...own, instructions.environment(conversation, model), instructions.additional && `# Additional instructions\n\n${instructions.additional}`]
    .filter(Boolean)
    .join('\n\n')
