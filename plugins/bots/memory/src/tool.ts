import type { Tool } from '@sand/tools/contract'
import { join } from 'node:path'
import { z } from 'zod'
import { type BotMemory, memoryName } from './contract'

export const memoryTool = (memory: BotMemory): Tool => ({
  name: 'memory_write',
  description:
    'Save a file in your memory, replacing what it held. Memory files are Markdown, named like people.md, and last across the whole conversation. Write an empty text to forget a file.',
  input: z.object({
    name: memoryName.describe('File name, like people.md'),
    text: z.string().describe('The whole new content of the file'),
  }),
  active: conversation => conversation.owner === 'bot',
  act: ({ name }, { cwd }) => ({ effect: 'write', paths: [join(cwd, 'memory', name)], summary: `Remember ${name}` }),
  async run({ name, text }, { conversation }) {
    if (!text.trim()) {
      await memory.remove(conversation.id, name)
      return `Forgot ${name}`
    }
    await memory.write(conversation.id, name, text)
    return `Saved ${name}`
  },
})
