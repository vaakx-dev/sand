import type { AppSession, Effort } from '../contract'
import { isModelContent, type Block, type Message, type ModelContent, type ToolResultBlock, unrecorded } from '@sand/chats/contract'
import { withoutReferences } from '../http/deferred'

export interface Outgoing {
  messages: Message[]
  waiting: string[]
  lead: ModelContent[]
  replay: boolean
  effort?: Effort
}

const unanswered = (callId: string): ToolResultBlock => ({ type: 'tool_result', callId, content: [{ type: 'text', text: unrecorded }], isError: true })

const said = (text: string): ModelContent => ({ type: 'text', text })

const ownBlock = (block: Block): ModelContent[] => {
  if (block.type === 'text') return [said(`[You said earlier in this turn]\n${block.text}`)]
  if (block.type === 'tool_call') return [said(`[You called ${block.name}(${JSON.stringify(block.input ?? {})}) as call ${block.id}]`)]
  return []
}

const resultText = ({ callId, content, isError }: ToolResultBlock): ModelContent[] => [
  said(`[Result of call ${callId}${isError ? ', failed' : ''}]`),
  ...withoutReferences(content),
]

const userBlock = (waiting: string[]) => (block: Block) => {
  if (block.type === 'tool_result') return waiting.includes(block.callId) ? [] : resultText(block)
  return isModelContent(block) ? [block] : []
}

export const deliver = (session: AppSession, { messages, waiting, lead, replay, effort }: Outgoing) => {
  const blocks = messages.flatMap(message => (message.role === 'user' ? message.content : []))
  const results = new Map(blocks.flatMap(block => (block.type === 'tool_result' ? [[block.callId, block] as const] : [])))
  const answers = waiting.map(id => results.get(id) ?? unanswered(id))
  const loose = [
    ...lead,
    ...messages.flatMap(message => {
      if (message.role === 'user') return message.content.flatMap(userBlock(waiting))
      return replay ? message.content.flatMap(ownBlock) : []
    }),
  ]
  if (!answers.length) return session.send(loose, effort)
  const last = answers.at(-1)!
  if (loose.length && session.steer) session.steer(loose)
  else if (loose.length) answers[answers.length - 1] = { ...last, content: [...last.content, ...loose] }
  answers.forEach(result => session.answer(result.callId, result))
}
