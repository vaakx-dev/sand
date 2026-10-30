import { hashSecret, randomSecret } from '@sand/util/fs'
import type { RouteCaller } from '../contract'

const grace = 60_000

interface Session {
  caller: RouteCaller
  sockets: number
  until: number
}

export const createSessions = () => {
  const sessions = new Map<string, Session>()
  const bySocket = new WeakMap<object, string>()

  const sweep = () => {
    const now = Date.now()
    for (const [hash, session] of sessions) if (!session.sockets && session.until <= now) sessions.delete(hash)
  }

  const find = (token: string) => sessions.get(hashSecret(token))

  return {
    create(caller: RouteCaller) {
      sweep()
      const token = randomSecret()
      sessions.set(hashSecret(token), { caller, sockets: 0, until: Date.now() + grace })
      return token
    },
    attach(token: string, socket: object) {
      const session = find(token)
      if (!session) return
      session.sockets++
      bySocket.set(socket, token)
    },
    detach(socket: object) {
      const token = bySocket.get(socket)
      bySocket.delete(socket)
      const session = token && find(token)
      if (!session) return
      session.sockets = Math.max(0, session.sockets - 1)
      if (!session.sockets) session.until = Date.now() + grace
    },
    of: (socket: object) => bySocket.get(socket),
    caller(token: string): RouteCaller | undefined {
      sweep()
      return find(token)?.caller
    },
    drop(device: string) {
      for (const [hash, session] of sessions) if (session.caller.device === device) sessions.delete(hash)
    },
  }
}

export type Sessions = ReturnType<typeof createSessions>
