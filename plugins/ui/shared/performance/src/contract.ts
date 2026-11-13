import { request, type } from '@sand/host-hub/contract'
import { type ChatUse, type PcPerformance, ranges } from '@sand/processes/contract'
import { z } from 'zod'

export { ranges, type Bar, type Range, type TreeUse, type Use } from '@sand/processes/contract'

export type ChatPlace = { kind: 'bot' } | { kind: 'thread'; cwd: string; project: string | null; quick: boolean }

export interface ChatRow extends ChatUse {
  title: string
  place: ChatPlace
}

export type PcReport = Omit<PcPerformance, 'chats'> & { chats: ChatRow[] }

export const performanceRead = request('performance.read', { input: () => z.object({ range: z.enum(ranges) }), output: type<PcReport>() })
