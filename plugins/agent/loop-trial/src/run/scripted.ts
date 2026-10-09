import type { LLM, LLMEvent, LLMRequest } from '@sand/llm-accounts/contract'
import type { Message, StopReason, Usage } from '@sand/messages'
import { pingAnswered, pingName } from './ping'

const model = 'loop-trial-script'

const zero: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const reply = (request: LLMRequest, call: number): { message: Message; stopReason: StopReason } => {
  const wantsPing = request.tools.some(tool => tool.name === pingName) && !pingAnswered(request.messages)
  if (wantsPing) {
    return {
      message: { role: 'assistant', content: [{ type: 'tool_call', id: `trial_ping_${call}`, name: pingName, input: {} }] },
      stopReason: 'tool_use',
    }
  }
  return { message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] }, stopReason: 'end_turn' }
}

export const scriptedLLM = (): LLM => {
  let calls = 0
  return {
    async *stream(request): AsyncGenerator<LLMEvent> {
      calls++
      yield { type: 'start', model }
      const { message, stopReason } = reply(request, calls)
      for (const [index, block] of message.content.entries()) yield { type: 'block', index, block }
      yield { type: 'done', message, stopReason, usage: zero }
    },
  }
}
