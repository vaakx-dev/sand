import type { Conversation } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { event, service, type Dispose } from 'drydock'
import { z } from 'zod'

export interface Note {
  name: string
  text: string
}

export interface MemoryRef {
  space: string
  id: string
}

export interface MemorySpace {
  name: string
  title: string
  about: string
  of(conversation: Conversation): string | undefined
  folder(id: string): string
}

export interface MemoryStore {
  read(ref: MemoryRef): Promise<string>
  write(ref: MemoryRef, text: string): Promise<void>
  notes(ref: MemoryRef): Promise<Note[]>
  writeNote(ref: MemoryRef, note: Note): Promise<void>
}

export interface Memory extends MemoryStore {
  space(space: MemorySpace): Dispose
  of(conversation: Conversation): MemoryRef | undefined
}

export const memoryLimit = 25_000
export const noteLimit = 6_000

export const noteName = lazy(() => z
  .string()
  .max(80)
  .regex(/^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u, 'A note name is letters, numbers, spaces, dots, dashes and underscores'))

export const noteAbout = ({ text }: Note) => text.trim().split('\n', 1)[0]?.replace(/^#+\s*/, '') ?? ''

export const memory = service<Memory>('memory')

const ref = lazy(() => z.object({ space: z.string(), id: z.string() }))

export const memoryChange = event<(ref: MemoryRef, text: string) => void>('memory.change')

export const memoryStore = event<(ref: MemoryRef) => void>('memory.store')

export const memoryChangeWire = wireEvent<[ref: MemoryRef, text: string]>('memory.change')

export const memoryRead = request('memory.read', { input: ref, output: type<string>() })
export const memoryWrite = request('memory.write', { input: () => ref().extend({ text: z.string().max(memoryLimit) }), output: type<void>() })
