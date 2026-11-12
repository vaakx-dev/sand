import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { textOf } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { usageRecord } from '@sand/usage/contract'
import { oneLine } from '@sand/util'

const MOST_GUESS_CHARS = 300

const PROMPT =
  "Don't answer or act on this message. Write the message the user is most likely to send next in this chat, worded as they would type it, in under 20 words. Reply with only that message and use no tools. If no next message is clear, reply with nothing."

const userFacing = (request: LLMRequest) => request.sessionKind !== 'agent'

const asked = (request: LLMRequest): LLMRequest => ({
  ...request,
  messages: [...request.messages, { role: 'user', content: [{ type: 'text', text: PROMPT }] }],
  aside: true,
})

const cleaned = (text: string) => {
  const line = oneLine(text).replace(/^["'`]+|["'`]+$/g, '').trim()
  return line.length <= MOST_GUESS_CHARS ? line : ''
}

const replyTo = async (llm: LLM, request: LLMRequest, signal: AbortSignal) => {
  for await (const event of llm.stream(request, signal)) {
    if (event.type !== 'done') continue
    const text = event.stopReason === 'tool_use' ? '' : textOf(event.message.content)
    return { text, usage: event.usage, source: event.source }
  }
  throw new Error('The guess ended without a reply')
}

export const guessNext = async (llm: LLM, conversation: Conversation, request: LLMRequest, signal: AbortSignal) => {
  if (!userFacing(request)) return ''
  const reply = await replyTo(llm, asked(request), signal)
  conversation.append('usage', usageRecord(llm.provider?.(request.model), request.model, reply.usage, reply.source))
  return cleaned(reply.text)
}
