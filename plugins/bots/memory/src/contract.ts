import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface MemoryFile {
  name: string
  size: number
  updated: number
}

export interface BotMemory {
  list(bot: string): Promise<MemoryFile[]>
  read(bot: string, name: string): Promise<string>
  write(bot: string, name: string, text: string): Promise<MemoryFile[]>
  remove(bot: string, name: string): Promise<MemoryFile[]>
}

export const botMemory = service<BotMemory>('botMemory')

export const memoryName = z
  .string()
  .trim()
  .regex(/^[\w][\w .-]*\.md$/, 'A memory file is a Markdown file name like notes.md')
  .max(80)

const one = z.object({ bot: z.string() })
const file = one.extend({ name: memoryName })

export const memoryChange = event<(bot: string, files: MemoryFile[]) => void>('botMemory.change')

export const memoryChangeWire = wireEvent<[bot: string, files: MemoryFile[]]>('botMemory.change')

export const memoryList = request('botMemory.list', { input: one, output: type<MemoryFile[]>() })
export const memoryRead = request('botMemory.read', { input: file, output: type<string>() })
export const memoryWrite = request('botMemory.write', { input: file.extend({ text: z.string().max(1_000_000) }), output: type<MemoryFile[]>() })
export const memoryRemove = request('botMemory.remove', { input: file, output: type<MemoryFile[]>() })
