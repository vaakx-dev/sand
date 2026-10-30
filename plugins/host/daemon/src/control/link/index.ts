import type { IdentityReply, PcIdentity } from '@sand/devices-contract'
import type { Request, WireEvent } from '@sand/host-hub/contract'
import type { DaemonLink, DaemonRequestOptions } from '../../contract'
import { ownIdentity } from './identity'
import { pcKeys } from './keys'
import { openSocket } from './socket'
import { requestTicket } from './ticket'

const defaultTimeout = 15_000

interface Waiter {
  resolve(result: unknown): void
  reject(error: Error): void
  timer: Timer
}

type Listener = (payload: unknown) => void

const identityOf = ({ id, name, platform, publicKey, build }: IdentityReply): PcIdentity => ({ id, name, platform, publicKey, ...(build && { build }) })

export const openLink = async (home: string, url: string): Promise<DaemonLink> => {
  const keys = await pcKeys(home)
  const identity = await ownIdentity(url, keys)
  const ticket = await requestTicket(url, keys, identity.nonce)
  const waiting = new Map<number, Waiter>()
  const listeners = new Map<string, Set<Listener>>()
  const { promise: closed, resolve: markClosed } = Promise.withResolvers<void>()
  let open = true
  let next = 0

  const take = (id: number) => {
    const waiter = waiting.get(id)
    waiting.delete(id)
    if (waiter) clearTimeout(waiter.timer)
    return waiter
  }

  const shut = () => {
    open = false
    for (const id of [...waiting.keys()]) take(id)?.reject(new Error('sand closed the connection'))
    markClosed()
  }

  const socket = await openSocket(url, ticket, {
    result(id, result, error) {
      const waiter = take(id)
      if (error === undefined) waiter?.resolve(result)
      else waiter?.reject(new Error(error))
    },
    event(name, payload) {
      for (const listener of listeners.get(name) ?? []) listener(payload)
    },
    closed: shut,
  })

  return {
    pc: identityOf(identity),
    call<I, O>(request: Request<I, O>, input: I, { timeout = defaultTimeout }: DaemonRequestOptions = {}) {
      return new Promise<O>((resolve, reject) => {
        if (!open) return reject(new Error('sand closed the connection'))
        const id = ++next
        const timer = setTimeout(() => take(id)?.reject(new Error(`sand did not answer ${request.id} in time`)), timeout)
        waiting.set(id, { resolve: result => resolve(result as O), reject, timer })
        socket.send({ type: request.id, id, input })
      })
    },
    on<P>(event: WireEvent<P>, listener: (payload: P) => void) {
      const heard = listeners.get(event.id) ?? new Set<Listener>()
      const wrapped: Listener = payload => listener(payload as P)
      heard.add(wrapped)
      listeners.set(event.id, heard)
      return () => void heard.delete(wrapped)
    },
    closed: () => closed,
    close() {
      socket.close()
      shut()
    },
  }
}
