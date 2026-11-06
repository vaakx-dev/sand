import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface BotMemory {
  read(bot: string): Promise<string>
  write(bot: string, text: string): Promise<void>
}

export const memoryLimit = 4_000

export const botMemory = service<BotMemory>('botMemory')

const one = z.object({ bot: z.string() })

export const memoryChange = event<(bot: string, text: string) => void>('botMemory.change')

export const memoryChangeWire = wireEvent<[bot: string, text: string]>('botMemory.change')

export const memoryRead = request('botMemory.read', { input: one, output: type<string>() })
export const memoryWrite = request('botMemory.write', { input: one.extend({ text: z.string().max(1_000_000) }), output: type<void>() })
