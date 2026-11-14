import type { Branch, Entry, EntryPage } from '@sand/chats/contract'
import { request, type } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'
import type { OpenedSession } from './relay'

const session = lazy(() => z.object({ session: z.string() }))
const place = 'thread'

export const sessionRemove = request('session.remove', { input: session, output: type<boolean>(), place })
export const sessionOpen = request('session.open', { input: session, output: type<OpenedSession>(), place })
export const sessionPage = request('session.page', {
  input: () => session().extend({ before: z.string(), limit: z.number().optional() }),
  output: type<EntryPage>(),
  place,
})
export const sessionSince = request('session.since', {
  input: () => session().extend({ after: z.union([z.number(), z.string()]) }),
  output: type<OpenedSession | null>(),
  place,
})
export const sessionEntries = request('session.entries', { input: session, output: type<Entry[]>(), place })
export const sessionCheckout = request('session.checkout', { input: () => session().extend({ entry: z.string().nullable() }), output: type<boolean>(), place })
export const sessionForks = request('session.forks', { input: session, output: type<Branch[][]>(), place })
export const uiFocus = request('ui.focus', { input: () => z.object({ session: z.string().optional() }), output: type<boolean>(), place })
export const uiWatch = request('ui.watch', { input: () => z.object({ sessions: z.array(z.string()) }), output: type<boolean>(), place })
