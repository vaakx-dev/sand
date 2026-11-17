import type { ThreadPcs } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

const sessionSchema = lazy(() => z.object({ session: z.string() }))

const sessionOf = (input: unknown) => sessionSchema().safeParse(input).data?.session

export const placeOf = <I, O>(request: Request<I, O>, input: I, home: string, threads: ThreadPcs | undefined) => {
  if (request.place !== 'thread') return home
  const session = sessionOf(input)
  return (session ? threads?.ofSession(session) : threads?.current()) ?? home
}
