import { type TransportInit, type ViaBody, viaMethods } from '@sand/devices-contract'
import { encodeBase64 } from './base64'

type ViaMethod = (typeof viaMethods)[number]

const isViaMethod = (method: string): method is ViaMethod => (viaMethods as readonly string[]).includes(method)

export const viaMethodOf = (init: TransportInit) => {
  const method = (init.method ?? 'GET').toUpperCase()
  if (!isViaMethod(method)) throw new Error(`${method} requests can't be sent through another PC`)
  return method
}

const hasHeader = (headers: Record<string, string>, name: string) => Object.keys(headers).some(key => key.toLowerCase() === name)

export const viaRequestOf = async (init: TransportInit) => {
  const headers = { ...init.headers }
  if (init.body === undefined) return { headers }
  if (typeof init.body === 'string') return { headers, body: { data: init.body, encoding: 'utf8' } satisfies ViaBody }
  const wrapped = new Response(init.body)
  const type = wrapped.headers.get('content-type')
  if (type && !hasHeader(headers, 'content-type')) headers['content-type'] = type
  const data = encodeBase64(new Uint8Array(await wrapped.arrayBuffer()))
  return { headers, body: { data, encoding: 'base64' } satisfies ViaBody }
}
