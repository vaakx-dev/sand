import type { LLMRequest } from '@sand/accounts/contract'
import type { Block } from '@sand/chats/contract'
import type { ContextParts } from '../contract'
import { charsOf, toolsChars } from './estimate'

const charsOfAll = (blocks: Block[]) => blocks.reduce((sum, block) => sum + charsOf(block), 0)

const sharesOf = ({ system, tools, messages }: LLMRequest): ContextParts => {
  const blocks = messages.flatMap(message => message.content)
  const results = charsOfAll(blocks.filter(block => block.type === 'tool_result'))
  return {
    system: system.length,
    tools: toolsChars(tools),
    conversation: charsOfAll(blocks) - results,
    results,
  }
}

export const partsOf = (request: LLMRequest, used: number): ContextParts => {
  const shares = sharesOf(request)
  const total = shares.system + shares.tools + shares.conversation + shares.results
  const scale = (share: number) => (total ? Math.floor((share * used) / total) : 0)
  const system = scale(shares.system)
  const tools = scale(shares.tools)
  const results = scale(shares.results)
  return { system, tools, conversation: used - system - tools - results, results }
}
