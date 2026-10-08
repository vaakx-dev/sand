import { parseCommand } from '@sand/kit'

export const commandOf = (prompt: string) => parseCommand(prompt.trim())
