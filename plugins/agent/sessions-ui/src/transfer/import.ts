import type { Entry, ThreadImportResult, ThreadLinkEntries, WireRequestOf } from '@sand/protocol'
import { expandHome, toolNotes } from '@sand/host'
import { isAbsolute } from 'node:path'
import type { SessionsContext } from '../types'
import { moveNote } from './note'
import { remapIds } from './remap'
import type { Staging } from './stage'

const isFolder = (path: string) =>
  Bun.file(path)
    .stat()
    .then(
      stats => stats.isDirectory(),
      () => false,
    )

const resolveFolder = async (typed: string) => {
  const path = typed.trim()
  if (!/^~(?=$|[\\/])/.test(path) && !isAbsolute(path)) return undefined
  const folder = expandHome(path)
  return (await isFolder(folder)) ? folder : undefined
}

const copies = (entries: Entry[]) => {
  const ids = new Map(entries.map(entry => [entry.id, Bun.randomUUIDv7()]))
  return entries.map(entry => ({ id: ids.get(entry.id)!, type: entry.type, data: remapIds(entry.data, ids), at: entry.at }))
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
    session.append('message', { role: 'user', content: [moveNote(request.from.name, request.pc, session.cwd, toolNotes(ctx.tools))] })
    return { session: session.id }
  }
