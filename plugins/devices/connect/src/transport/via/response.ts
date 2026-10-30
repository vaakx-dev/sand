import type { ViaReply } from '@sand/devices-contract'
import { decodeBase64 } from './base64'

const bodyless = new Set([204, 205, 304])

const bodyOf = (reply: ViaReply) => {
  if (bodyless.has(reply.status)) return null
  return reply.encoding === 'base64' ? decodeBase64(reply.body) : reply.body
}

export const viaResponse = (reply: ViaReply) => new Response(bodyOf(reply), { status: reply.status, headers: reply.headers })
