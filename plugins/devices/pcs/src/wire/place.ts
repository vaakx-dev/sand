import type { ThreadPcs } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import { isRecord } from '@sand/util'

const sessionOf = (input: unknown) => (isRecord(input) && typeof input.session === 'string' ? input.session : undefined)

export const placeOf = <I, O>(request: Request<I, O>, input: I, home: string, threads: ThreadPcs | undefined) => {
  if (request.place !== 'thread') return home
  const session = sessionOf(input)
  return (session ? threads?.ofSession(session) : threads?.current()) ?? home
}
