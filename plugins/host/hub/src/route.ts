import type { RuntimeView } from '@sand/host-runtimes/contract'
import { z } from 'zod'
import type { ClientMessage } from './contract'

const drainer = (session: string, live: RuntimeView[], current: RuntimeView | undefined) =>
  live.find(runtime => runtime.id !== current?.id && runtime.activity.sessions.includes(session))

const withSession = z.object({ session: z.string() })

const sessionOf = (request: ClientMessage) => withSession.safeParse(request.input).data?.session

export const route = (request: ClientMessage, live: RuntimeView[], current: RuntimeView | undefined): RuntimeView | undefined => {
  const session = sessionOf(request)
  return (session && drainer(session, live, current)) || current
}
