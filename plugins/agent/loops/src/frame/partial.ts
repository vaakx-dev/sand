import type { LLMEvent } from '@sand/llm-accounts/contract'
import type { Block, Message } from '@sand/messages'

export interface PartialReply {
  observe(event: LLMEvent): void
  message(): Message | undefined
  clear(): void
}

export const createPartial = (): PartialReply => {
  const blocks = new Map<number, Block>()
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
    },
    clear: () => blocks.clear(),
    message() {
      const content = [...blocks.entries()].sort(([a], [b]) => a - b).map(([, block]) => block)
      const spoken = content.some(block => block.type === 'text' && block.text.trim())
      if (!spoken) return undefined
      return { role: 'assistant', content: content.filter(block => block.type !== 'text' || block.text.trim()) }
    },
  }
}
