import type { ViaBody } from '@sand/devices-contract'

const droppedReplyHeaders = new Set(['connection', 'content-encoding', 'content-length', 'set-cookie', 'transfer-encoding'])

export const bodylessStatuses = new Set([101, 204, 205, 304])

export const encodeBytes = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')

export const decodeBytes = (data: string) => new Uint8Array(Buffer.from(data, 'base64'))

export const decodeBody = (body: ViaBody | undefined) => {
  if (!body) return undefined
  return body.encoding === 'base64' ? decodeBytes(body.data) : body.data
}

export const encodeBody = async (body: BodyInit | null | undefined): Promise<ViaBody | undefined> => {
  if (body == null) return undefined
  if (typeof body === 'string') return { data: body, encoding: 'utf8' }
  return { data: encodeBytes(new Uint8Array(await new Response(body).arrayBuffer())), encoding: 'base64' }
}

export const headerRecord = (headers: HeadersInit | undefined) => {
  const kept: Record<string, string> = {}
  new Headers(headers).forEach((value, name) => {
    kept[name] = value
  })
  return kept
}

export const replyHeaders = (headers: Headers) => {
  const kept: Record<string, string> = {}
  headers.forEach((value, name) => {
    if (!droppedReplyHeaders.has(name.toLowerCase())) kept[name] = value
  })
  return kept
}
