import { request, type } from '@sand/host-hub/contract'
import type { Range } from '@sand/util'
import { z } from 'zod'

export type ChatOwner = 'thread' | 'bot'

export type Fit = 'phrase' | 'words' | 'prefixes'

export interface Excerpt {
  text: string
  marks: Range[]
}

export interface MessageHit {
  entry: string
  block: number
  role: 'user' | 'assistant'
  at: number
  fit: Fit
  excerpt: Excerpt
}

export interface ChatHits {
  owner: ChatOwner
  chat: string
  title: string
  at: number
  fit: Fit
  weight: number
  matches: number
  hits: MessageHit[]
}

export interface Indexing {
  done: number
  total: number
}

export interface Found {
  chats: ChatHits[]
  indexing?: Indexing
}

export const fits: Fit[] = ['phrase', 'words', 'prefixes']

export const queryLimit = 200

export const mostHits = 100

export const messagesSearch = request('messages.search', {
  input: () =>
    z.object({
      query: z.string().trim().min(1).max(queryLimit),
      owner: z.enum(['thread', 'bot']).optional(),
      chat: z.string().min(1).optional(),
      before: z.number().optional(),
      limit: z.number().int().min(1).max(mostHits).optional(),
    }),
  output: type<Found>(),
  callers: 'any',
})
