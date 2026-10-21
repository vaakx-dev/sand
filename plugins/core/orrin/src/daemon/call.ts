import type { OrrinInput, OrrinOutput, OrrinRequest } from '../contract'
import type { Daemon } from './find'

interface Reply {
  ok: boolean
  result?: unknown
  error?: { code?: string; message?: string }
}

export class Unreachable extends Error {}

export const localHeaders = (daemon: Daemon): Record<string, string> => (daemon.key ? { 'x-orrin-local': daemon.key } : {})

const post = async (daemon: Daemon, request: string, input: unknown, signal?: AbortSignal) => {
  try {
    return await fetch(`${daemon.url}/api/${request}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...localHeaders(daemon) },
      body: JSON.stringify(input),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Unreachable(`Orrin is not reachable at ${daemon.url}`)
  }
}

export const callDaemon = async <R extends OrrinRequest>(
  daemon: Daemon,
  request: R,
  input: OrrinInput<R>,
  signal?: AbortSignal,
): Promise<OrrinOutput<R>> => {
  const response = await post(daemon, request, input, signal)
  const reply = (await response.json().catch(() => ({ ok: false }))) as Reply
  if (reply.ok) return reply.result as OrrinOutput<R>
  throw new Error(reply.error?.message ?? `Orrin ${request} failed with HTTP ${response.status}`)
}
