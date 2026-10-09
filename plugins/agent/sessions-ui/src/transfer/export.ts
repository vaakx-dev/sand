import type { Entry, ThreadExportPage, WireRequestOf } from '@sand/protocol'
import { scratchRoot } from '@sand/host'
import { isInside } from '@sand/kit'
import type { SessionsContext } from '../types'

const pageBytes = 4 * 1024 * 1024
const skipped = new Set(['usage', 'continued-to'])

const page = (entries: Entry[], offset: number, limit: number) => {
  let end = offset
  let size = 2
  while (end < entries.length) {
    size += Buffer.byteLength(JSON.stringify(entries[end])) + 1
    if (size > limit && end > offset) break
    end++
  }
  return { entries: entries.slice(offset, end), next: end < entries.length ? end : null }
}

export const exportThread =
  (ctx: SessionsContext, limit = pageBytes) =>
  (request: WireRequestOf<'thread.export'>): ThreadExportPage => {
    const session = ctx.sessions.open(request.session)
    if (!session) throw new Error('No such thread')
    if (session.kind === 'agent') throw new Error("Agent threads can't be continued on another PC")
    if (ctx.loop?.active(session)) throw new Error('Wait for the current turn to finish')
    const entries = session.path().filter(entry => !skipped.has(entry.type))
    return {
      title: session.title,
      cwd: session.cwd,
      scratch: isInside(session.cwd, scratchRoot(ctx)),
      ...page(entries, Math.max(0, request.offset), limit),
    }
  }
