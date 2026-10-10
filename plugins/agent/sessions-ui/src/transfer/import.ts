import type { WireRequestOf } from '@sand/protocol'
import type { Entry, TextBlock } from '@sand/messages'
import type { ThreadImportResult, ThreadLinkEntries } from '@sand/sessions-sqlite/contract'
import { noteBlock } from '@sand/kit'
import { expandHome, isFolder } from '@sand/kit/fs'
import { isAbsolute } from 'node:path'
import type { SessionsContext } from '../types'
import type { Staging } from './stage'

const resolveFolder = async (typed: string) => {
  const path = typed.trim()
  if (!/^~(?=$|[\\/])/.test(path) && !isAbsolute(path)) return undefined
  const folder = expandHome(path)
  return (await isFolder(folder)) ? folder : undefined
}

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype

const remapIds = (value: unknown, ids: Map<string, string>): unknown => {
  if (typeof value === 'string') return ids.get(value) ?? value
  if (Array.isArray(value)) return value.map(item => remapIds(item, ids))
  if (isPlain(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapIds(item, ids)]))
  return value
}

const copies = (entries: Entry[]) => {
  const ids = new Map(entries.map(entry => [entry.id, Bun.randomUUIDv7()]))
  return entries.map(entry => ({ id: ids.get(entry.id)!, type: entry.type, data: remapIds(entry.data, ids), at: entry.at }))
}

const moveNote = (from: string, pc: string, cwd: string, notes: string[]): TextBlock => {
  const facts = [`Moved from ${from} to ${pc}.`, `Working directory: ${cwd}.`, `Platform: ${process.platform}.`, ...notes.map(note => `${note}.`)]
  return noteBlock('sand', `${facts.join(' ')}\nEarlier tool results came from ${from}; files, processes and tools here may differ.`)
}

export const importThread =
  (ctx: SessionsContext, staging: Staging) =>
  async (request: WireRequestOf<'thread.import'>): Promise<ThreadImportResult> => {
    const cwd = request.cwd && (await resolveFolder(request.cwd))
    if (request.cwd && !cwd) return { missing: request.cwd }
    const entries = staging.take(request.transfer)
    if (!entries?.length) throw new Error('This transfer has expired')
    const session = ctx.sessions.create({
      ...(cwd && { cwd }),
      ...(cwd && request.project && { project: request.project }),
      title: request.title ?? undefined,
    })
    if (request.title && request.named) session.rename(request.title, true)
    session.appendMany(copies(entries))
    session.append('continued-from', request.from satisfies ThreadLinkEntries['continued-from'])
    session.append('message', { role: 'user', content: [moveNote(request.from.name, request.pc, session.cwd, ctx.tools?.notes() ?? [])] })
    return { session: session.id }
  }
