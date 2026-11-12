import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface Note {
  name: string
  text: string
}

export interface BotMemory {
  read(bot: string): Promise<string>
  write(bot: string, text: string): Promise<void>
  notes(bot: string): Promise<Note[]>
  writeNote(bot: string, note: Note): Promise<void>
}

export const memoryLimit = 4_000
export const noteLimit = 6_000

export const noteName = lazy(() => z
  .string()
  .max(80)
  .regex(/^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u, 'A note name is letters, numbers, spaces, dots, dashes and underscores'))

export const noteAbout = ({ text }: Note) => text.trim().split('\n', 1)[0]?.replace(/^#+\s*/, '') ?? ''

export const botMemory = service<BotMemory>('botMemory')

const one = lazy(() => z.object({ bot: z.string() }))

export const memoryChange = event<(bot: string, text: string) => void>('botMemory.change')
export const noteChange = event<(bot: string, note: Note) => void>('botMemory.note')

export const memoryChangeWire = wireEvent<[bot: string, text: string]>('botMemory.change')
export const noteChangeWire = wireEvent<[bot: string, note: Note]>('botMemory.note')

export const memoryRead = request('botMemory.read', { input: one, output: type<string>() })
export const memoryWrite = request('botMemory.write', { input: () => one().extend({ text: z.string().max(1_000_000) }), output: type<void>() })
