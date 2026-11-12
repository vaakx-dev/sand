import type { LLMRequest } from '@sand/accounts/contract'
import type { Block } from '@sand/chats/contract'
import type { ContextPart, SystemPart } from '../contract'
import { charsOf, toolsChars } from './estimate'

interface Share extends Omit<ContextPart, 'size'> {
  chars: number
}

const CONVERSATION = 'Conversation'

const charsOfAll = (blocks: Block[]) => blocks.reduce((sum, block) => sum + charsOf(block), 0)

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

const systemSharesOf = (system: string, carved: SystemPart[]): Share[] => {
  const shares = carved.map(({ name, tone, chars }) => ({ name, tone, chars: chars(system) })).filter(share => share.chars > 0)
  return [{ name: 'Instructions', tone: 'violet', chars: system.length - sum(shares.map(share => share.chars)) }, ...shares]
}

const sharesOf = ({ system, tools, messages }: LLMRequest, carved: SystemPart[]): Share[] => {
  const blocks = messages.flatMap(message => message.content)
  const results = charsOfAll(blocks.filter(block => block.type === 'tool_result'))
  return [
    ...systemSharesOf(system, carved),
    { name: 'Tools', tone: 'info', chars: toolsChars(tools) },
    { name: CONVERSATION, tone: 'accent', chars: charsOfAll(blocks) - results },
    { name: 'Tool results', tone: 'success', chars: results },
  ]
}

export const partsOf = (request: LLMRequest, used: number, carved: SystemPart[]): ContextPart[] => {
  const shares = sharesOf(request, carved)
  const total = sum(shares.map(share => share.chars))
  const scale = (chars: number) => (total ? Math.floor((chars * used) / total) : 0)
  const parts = shares.map(({ chars, ...look }) => ({ ...look, size: scale(chars) }))
  const rest = used - sum(parts.map(part => part.size))
  return parts.map(part => (part.name === CONVERSATION ? { ...part, size: part.size + rest } : part))
}
