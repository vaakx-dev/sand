import { body } from '@sand/anthropic'
import type { LLMRequest, Message } from '@sand/protocol'
import { isReasoning } from '../reasoning'
import { describeClaude } from './models'

export const fastBeta = 'fast-mode-2026-02-01'

export interface ClaudeSettings {
  model: string
  maxTokens: number
  thinking?: 'summarized' | 'omitted'
}

export type Payload = Record<string, unknown>

export interface ClaudeCall {
  url: string
  payload: Payload
  headers(fast: boolean): Record<string, string>
  original(name: string): string
}

const ownBlocks = (messages: Message[]): Message[] =>
  messages.map(message => ({
    ...message,
    content: message.content.filter(block => !(block.type === 'thinking' && isReasoning(block.signature))),
  }))

export const claudeBody = (request: LLMRequest, settings: ClaudeSettings) => {
  const info = describeClaude(settings.model)
  return body(
    { ...request, messages: ownBlocks(request.messages) },
    { model: settings.model, maxTokens: settings.maxTokens, efforts: info.efforts, fast: info.fast, thinking: settings.thinking },
  )
}
