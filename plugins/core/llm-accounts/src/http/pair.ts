import type { Block, Message, ToolResultBlock } from '@sand/messages'

const unfinished = (callId: string): ToolResultBlock => ({
  type: 'tool_result',
  callId,
  content: [{ type: 'text', text: 'Not run: the turn stopped before this call finished.' }],
  isError: true,
})

const merge = (messages: Message[]) =>
  messages.reduce<Message[]>((merged, message) => {
    const last = merged.at(-1)
    if (last?.role === message.role) merged[merged.length - 1] = { ...last, content: [...last.content, ...message.content] }
    else merged.push(message)
    return merged
  }, [])

const answer = (message: Message, calls: string[]): Message => {
  const results = new Map(message.content.flatMap(block => (block.type === 'tool_result' ? [[block.callId, block] as const] : [])))
  const rest = message.content.filter(block => block.type !== 'tool_result')
  return { ...message, content: [...calls.map(id => results.get(id) ?? unfinished(id)), ...rest] }
}

const callsOf = (content: Block[]) => content.flatMap(block => (block.type === 'tool_call' ? [block.id] : []))

export const pair = (messages: Message[]): Message[] => {
  const merged = merge(messages)
  return merged.flatMap((message, index) => {
    if (message.role === 'assistant') return [message]
    const previous = merged[index - 1]
    const answered = answer(message, previous ? callsOf(previous.content) : [])
    return answered.content.length ? [answered] : []
  })
}
