import type { RuntimeView } from '@sand/host-runtimes/contract'
import { isRecord } from '@sand/util'
import type { ClientMessage } from './contract'

const drainer = (session: string, live: RuntimeView[], current: RuntimeView | undefined) =>
  live.find(runtime => runtime.id !== current?.id && runtime.activity.sessions.includes(session))

const sessionOf = (request: ClientMessage) => (isRecord(request.input) && typeof request.input.session === 'string' ? request.input.session : undefined)

export const route = (request: ClientMessage, live: RuntimeView[], current: RuntimeView | undefined): RuntimeView | undefined => {
  const session = sessionOf(request)
  return (session && drainer(session, live, current)) || current
}
