import { request, type, wireEvent } from '@sand/host-hub/contract'
import { type ChatUse, type PcPerformance, ranges } from '@sand/processes/contract'
import { z } from 'zod'

export { ranges, type Bar, type Bars, type Range, type TreeUse, type Use } from '@sand/processes/contract'

export type ChatPlace = { kind: 'bot' } | { kind: 'thread'; cwd: string; project: string | null; quick: boolean }

export interface ChatRow extends ChatUse {
  title: string
  place: ChatPlace
}

export type PcReport = Omit<PcPerformance, 'chats'> & { chats: ChatRow[] }

export interface ChatsChange {
  changed: ChatRow[]
  gone: string[]
}

export type PcChange = Partial<Omit<PcReport, 'chats'>> & { chats?: ChatsChange }

export const performanceWatch = request('performance.watch', { input: () => z.object({ range: z.enum(ranges) }), output: type<PcReport>() })

export const performanceUnwatch = request('performance.unwatch', { input: () => z.object({}), output: type<void>() })

export const performanceChange = wireEvent<PcChange>('performance.change')
