import type { LLMEvent } from '@sand/accounts/contract'
import type { Block, Message } from '@sand/chats/contract'

const flushEvery = 2_000

export interface PartialReply {
  observe(event: LLMEvent): void
  message(): Message | undefined
  clear(): void
  stop(): void
}

export const createPartial = (save: (message: Message | undefined) => void): PartialReply => {
  const blocks = new Map<number, Block>()
  let changed = false

  const message = (): Message | undefined => {
    const content = [...blocks.entries()].sort(([a], [b]) => a - b).map(([, block]) => block)
    const spoken = content.some(block => block.type === 'text' && block.text.trim())
    if (!spoken) return undefined
    return { role: 'assistant', content: content.filter(block => block.type !== 'text' || block.text.trim()) }
  }

  const timer = setInterval(() => {
    if (!changed) return
    changed = false
    save(message())
  }, flushEvery)

  return {
    observe(event) {
      if (event.type === 'start') blocks.clear()
      if (event.type === 'text') {
        const current = blocks.get(event.index)
        blocks.set(event.index, { type: 'text', text: (current?.type === 'text' ? current.text : '') + event.text })
      }
      if (event.type === 'block' && (event.block.type === 'text' || event.block.type === 'thinking')) {
        blocks.set(event.index, { ...event.block })
      }
      changed ||= event.type === 'start' || event.type === 'text' || event.type === 'block'
    },
    message,
    clear() {
      blocks.clear()
      changed = false
    },
    stop: () => clearInterval(timer),
  }
}
