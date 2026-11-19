import { devicePaths, type ViaHead, viaChunk, type viaFetch, type RelayChunk } from '@sand/devices-contract'
import type { Caller, Hub, InputOf } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { bodylessStatuses, decodeBody, encodeBytes, replyHeaders } from '../encoding'

interface Body {
  owner: Caller
  controller: AbortController
}

const openPaths: string[] = [devicePaths.identity, devicePaths.ticket, devicePaths.pair, devicePaths.joinRequest]
const passedHeaders = new Set(['accept', 'content-type', 'authorization'])
const ANSWER_TIMEOUT_MS = 30_000

const open = (pathname: string) => openPaths.includes(pathname) || pathname.startsWith(`${devicePaths.joinRequest}/`)

const requestHeaders = (headers: Record<string, string> = {}) =>
  Object.fromEntries(Object.entries(headers).filter(([name]) => passedHeaders.has(name.toLowerCase())))

const signedIn = (headers: Record<string, string>) => Object.keys(headers).some(name => name.toLowerCase() === 'authorization')

const targetUrl = (base: string, path: string, headers: Record<string, string>) => {
  const url = new URL(path, base)
  if (url.origin !== new URL(base).origin) throw new Error(`${url.pathname} can't be fetched through this PC`)
  if (!open(url.pathname) && !signedIn(headers)) throw new Error(`${url.pathname} needs a session on the PC it goes to`)
  return url
}

interface Asked {
  url: URL
  input: InputOf<typeof viaFetch>
  headers: Record<string, string>
  controller: AbortController
}

const answer = async ({ url, input, headers, controller }: Asked) => {
  const timer = setTimeout(() => controller.abort(new Error(`${url.host} didn't answer in time`)), ANSWER_TIMEOUT_MS)
  try {
    return await fetch(url, { method: input.method ?? 'GET', headers, body: decodeBody(input.body), redirect: 'manual', signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export const forwardFetches = (hub: Pick<Hub, 'tell'>) => {
  const bodies = new Map<string, Body>()

  const send = (owner: Caller, chunk: RelayChunk) => hub.tell(owner, viaChunk, chunk)

  const pump = async (stream: string, owner: Caller, body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return send(owner, { stream, done: true })
        send(owner, { stream, data: encodeBytes(value) })
      }
    } catch (error) {
      if (bodies.has(stream)) send(owner, { stream, error: errorMessage(error) })
    } finally {
      bodies.delete(stream)
    }
  }

  const fetchHead = async (base: string, input: InputOf<typeof viaFetch>, owner: Caller): Promise<ViaHead> => {
    const headers = requestHeaders(input.headers)
    const url = targetUrl(base, input.path, headers)
    const controller = new AbortController()
    const response = await answer({ url, input, headers, controller })
    const head = { status: response.status, headers: replyHeaders(response.headers) }
    if (!response.body || bodylessStatuses.has(response.status)) return head
    const stream = crypto.randomUUID()
    bodies.set(stream, { owner, controller })
    void pump(stream, owner, response.body)
    return { ...head, stream }
  }

  const close = (stream: string, caller: Caller) => {
    const body = bodies.get(stream)
    if (body?.owner !== caller) return false
    bodies.delete(stream)
    body.controller.abort()
    return true
  }

  const leave = (caller: Caller) => {
    for (const [stream, body] of bodies) if (body.owner === caller) close(stream, caller)
  }

  const closeAll = () => {
    for (const body of bodies.values()) body.controller.abort()
    bodies.clear()
  }

  return { fetchHead, close, leave, closeAll }
}
