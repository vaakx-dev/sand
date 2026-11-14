import { request, type } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface FoundBlock {
  entry: string
  block: number
  count: number
}

export interface FindAt {
  query: string
  entry: string
  block: number
}

export interface ChatFinder {
  open(conversation: string, at?: FindAt): void
}

export const queryLimit = 200

export const chatFind = request('chat.find', {
  input: () =>
    z.object({
      owner: z.enum(['thread', 'bot']),
      chat: z.string().min(1),
      query: z.string().min(1).max(queryLimit),
      before: z.string().min(1).optional(),
    }),
  output: type<FoundBlock[]>(),
})

export const chatFinder = service<ChatFinder>('chatFinder')
