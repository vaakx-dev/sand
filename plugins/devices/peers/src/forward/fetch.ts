import { devicePaths, type ViaEncoding, type ViaReply, type viaFetch } from '@sand/devices-contract'
import type { InputOf } from '@sand/host-hub/contract'
import { decodeBody, encodeBytes, replyHeaders } from '../encoding'

const forwardedPaths: string[] = [devicePaths.identity, devicePaths.ticket, devicePaths.pair, devicePaths.joinRequest]
const passedHeaders = new Set(['accept', 'content-type'])
const fetchTimeout = 30_000
const utf8 = new TextDecoder('utf-8', { fatal: true })

const forwardable = (pathname: string) => forwardedPaths.includes(pathname) || pathname.startsWith(`${devicePaths.joinRequest}/`)

const targetUrl = (base: string, path: string) => {
  const url = new URL(path, base)
  if (url.origin !== new URL(base).origin || !forwardable(url.pathname)) throw new Error(`${url.pathname} can't be fetched through this PC`)
  return url
}

const requestHeaders = (headers: Record<string, string> = {}) =>
  Object.fromEntries(Object.entries(headers).filter(([name]) => passedHeaders.has(name.toLowerCase())))

const replyBody = (bytes: Uint8Array): { body: string; encoding: ViaEncoding } => {
  try {
    return { body: utf8.decode(bytes), encoding: 'utf8' }
  } catch {
    return { body: encodeBytes(bytes), encoding: 'base64' }
  }
}

export const forwardFetch = async (base: string, input: InputOf<typeof viaFetch>): Promise<ViaReply> => {
  const response = await fetch(targetUrl(base, input.path), {
    method: input.method ?? 'GET',
    headers: requestHeaders(input.headers),
    body: decodeBody(input.body),
    redirect: 'manual',
    signal: AbortSignal.timeout(fetchTimeout),
  })
  return { status: response.status, headers: replyHeaders(response.headers), ...replyBody(new Uint8Array(await response.arrayBuffer())) }
}
