import type { Block, StopReason } from '@sand/chats/contract'
import type { LLMEvent, Usage } from '../contract'
import type { Signal } from './signals'

const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

const add = (total: Usage, more: Partial<Usage>) => {
  total.input += more.input ?? 0
  total.output += more.output ?? 0
  total.cacheRead += more.cacheRead ?? 0
  total.cacheWrite += more.cacheWrite ?? 0
}

export async function* readStep(next: () => Promise<Signal>, model: string): AsyncGenerator<LLMEvent> {
  const blocks: Block[] = []
  const usage = emptyUsage()
  let open: Block | undefined

  const close = function* (): Generator<LLMEvent> {
    if (open) yield { type: 'block', index: blocks.length - 1, block: open }
    open = undefined
  }

  const done = (stopReason: StopReason): LLMEvent => ({ type: 'done', message: { role: 'assistant', content: blocks }, stopReason, usage })

  yield { type: 'start', model }
  for (;;) {
    const signal = await next()
    switch (signal.type) {
      case 'text':
        if (open?.type !== 'text') {
          yield* close()
          open = { type: 'text', text: '' }
          blocks.push(open)
        }
        open.text += signal.text
        yield { type: 'text', index: blocks.length - 1, text: signal.text }
        break
      case 'thinking':
        if (open?.type !== 'thinking') {
          yield* close()
          open = { type: 'thinking', thinking: '' }
          blocks.push(open)
        }
        open.thinking += signal.text
        yield { type: 'thinking', index: blocks.length - 1, text: signal.text }
        break
      case 'call': {
        yield* close()
        const block: Block = { type: 'tool_call', ...signal.call }
        blocks.push(block)
        const index = blocks.length - 1
        yield { type: 'tool_call', index, id: signal.call.id, name: signal.call.name }
        yield { type: 'block', index, block }
        break
      }
      case 'usage':
        add(usage, signal.usage)
        break
      case 'pause':
        if (!blocks.some(block => block.type === 'tool_call')) break
        yield* close()
        yield done('tool_use')
        return
      case 'finish':
        yield* close()
        yield done(signal.stopReason)
        return
      case 'fail':
        throw signal.error
    }
  }
}
