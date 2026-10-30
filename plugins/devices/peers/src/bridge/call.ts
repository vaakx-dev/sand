import type { Peers } from '@sand/devices-contract'
import { type Request, request, type } from '@sand/host-hub/contract'
import { z } from 'zod'
import { relayed } from './outcome'

const known = new Map<string, Request<unknown, unknown>>()

const requestOf = (id: string) => {
  const found = known.get(id) ?? request(id, { input: z.unknown(), output: type<unknown>() })
  known.set(id, found)
  return found
}

export const relayCall = (peers: Peers, pc: string, id: string, input: unknown, timeout?: number) =>
  relayed(() => peers.call(pc, requestOf(id), input, { timeout }))
