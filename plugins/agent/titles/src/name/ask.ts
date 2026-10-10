import type { LLM } from '@sand/llm-accounts/contract'
import type { Message } from '@sand/messages'
import { shorten } from '../title'
import { system } from './prompt'

const timeout = 30_000
const maxLength = 60

const clean = (reply: string) => {
  const first = reply.trim().split('\n', 1)[0] ?? ''
  const bare = first.replace(/^(thread )?(name|title):\s*/i, '').replace(/^["'`*\s]+|["'`*.\s]+$/g, '')
  return shorten(bare.replace(/\s+/g, ' '), maxLength)
}

export const askName = async (llm: LLM, text: string, model?: string) => {
  const message: Message = { role: 'user', content: [{ type: 'text', text: `Name this thread:\n\n${text}` }] }
  for await (const event of llm.stream({ system, messages: [message], tools: [], model }, AbortSignal.timeout(timeout))) {
    if (event.type !== 'done') continue
    const reply = event.message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join(' ')
    return { name: clean(reply), usage: event.usage }
  }
  return undefined
}
