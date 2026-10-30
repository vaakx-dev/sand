import { type Entry, type EntryPage, promptInput, type SessionInfo, type SessionSummary } from '@sand/chats/contract'
import { request, type } from '@sand/host-hub/contract'
import type { TurnResult } from '@sand/loop/contract'
import { z } from 'zod'
import type { OpenedSession } from './relay'

const session = z.object({ session: z.string() })
const place = 'thread'

export const sessionsList = request('sessions.list', { input: z.object({}), output: type<SessionSummary[]>() })
export const sessionsCreate = request('sessions.create', { input: z.object({ cwd: z.string() }), output: type<SessionInfo>(), place })
export const sessionsQuick = request('sessions.quick', { input: z.object({}), output: type<SessionInfo>() })
export const sessionRename = request('session.rename', { input: session.extend({ title: z.string() }), output: type<boolean>(), place })
export const sessionRemove = request('session.remove', { input: session, output: type<boolean>(), place })
export const sessionPin = request('session.pin', { input: session.extend({ pinned: z.boolean() }), output: type<boolean>(), place })
export const sessionSettle = request('session.settle', { input: session.extend({ settled: z.boolean() }), output: type<boolean>(), place })
export const sessionSnooze = request('session.snooze', { input: session.extend({ until: z.number().nullable() }), output: type<boolean>(), place })
export const sessionMove = request('session.move', { input: session.extend({ position: z.number() }), output: type<boolean>(), place })
export const sessionOpen = request('session.open', { input: session, output: type<OpenedSession>(), place })
export const sessionPage = request('session.page', {
  input: session.extend({ before: z.string(), limit: z.number().optional() }),
  output: type<EntryPage>(),
  place,
})
export const sessionSince = request('session.since', { input: session.extend({ after: z.string() }), output: type<OpenedSession | null>(), place })
export const sessionEntries = request('session.entries', { input: session, output: type<Entry[]>(), place })
export const sessionAppend = request('session.append', {
  input: session.extend({ entry: z.object({ id: z.string(), type: z.string(), data: z.unknown() }) }),
  output: type<boolean>(),
  place,
})
export const sessionCheckout = request('session.checkout', { input: session.extend({ entry: z.string().nullable() }), output: type<boolean>(), place })
export const loopRun = request('loop.run', { input: session.extend({ prompt: promptInput }), output: type<TurnResult>(), place })
export const loopInterrupt = request('loop.interrupt', { input: session, output: type<boolean>(), place })
export const uiFocus = request('ui.focus', { input: z.object({ session: z.string().optional() }), output: type<boolean>(), place })
