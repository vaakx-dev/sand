import type { RouteCaller } from '@sand/host-gateway/contract'
import type { Server } from '@sand/server/contract'
import { bytes, isRecord, oneLine } from '@sand/util'
import { randomSecret } from '@sand/util/fs'
import { z } from 'zod'
import type { Change, Kind, KindContext } from '../contract'

const input = z.object({})
const route = z.object({ secret: z.string().min(1) })

const hookPath = '/hooks/'

const reach = 'Reachable from this computer, your local network and Tailscale, never from the public internet'
const localReach = 'Reachable only from this computer, until sand listens on your network'

export const isLoopback = (url: string) => /^https?:\/\/(127\.|\[::1\]|localhost)/.test(url)
const bodyMost = 1 << 20
const detailMost = 8_000
const methods = new Set(['POST', 'PUT'])
const hintKeys = ['summary', 'title', 'subject', 'message', 'text', 'event', 'type', 'action', 'status']
const eventHeaders = ['x-github-event', 'x-gitlab-event', 'x-event-key', 'x-event-type']

const parse = (request: Request, text: string): unknown => {
  if (request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text))
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const senderOf = (request: Request, caller: RouteCaller | undefined) => {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || caller?.name
  const agent = request.headers.get('user-agent')
  const shown = agent && oneLine(agent, 80)
  if (!address) return shown || 'unknown sender'
  return shown ? `${address} (${shown})` : address
}

const hintOf = (value: unknown) => {
  if (!isRecord(value)) return
  return hintKeys.map(key => value[key]).find((field): field is string => typeof field === 'string' && field.trim() !== '')
}

const summaryOf = (request: Request, value: unknown, text: string) => {
  const event = eventHeaders.map(header => request.headers.get(header)).find(Boolean)
  const line = value === undefined ? text : hintOf(value)
  const parts = [event, line].filter(part => part?.trim())
  if (parts.length) return oneLine(parts.join(': '), 160)
  return text.trim() ? `${request.method} of ${bytes(text.length)}` : `${request.method} with an empty body`
}

const clip = (text: string) => (text.length > detailMost ? `${text.slice(0, detailMost)}…` : text)

const changeOf = (request: Request, caller: RouteCaller | undefined, text: string): Change => {
  const value = parse(request, text)
  const detail = clip(value === undefined ? text : JSON.stringify(value, null, 2))
  return { at: Date.now(), from: senderOf(request, caller), summary: summaryOf(request, value, text), ...(detail.trim() ? { detail } : {}) }
}

const receive = async (request: Request, caller: RouteCaller | undefined, context: KindContext) => {
  if (!methods.has(request.method)) return new Response('send a POST or PUT', { status: 405, headers: { allow: 'POST, PUT' } })
  if (Number(request.headers.get('content-length')) > bodyMost) return new Response('too large', { status: 413 })
  context.emit(changeOf(request, caller, await request.text()))
  return new Response('accepted', { status: 202 })
}

export const webhookKind = (server: Pick<Server, 'route'>, origin: () => Promise<string | undefined>): Kind<typeof input> => ({
  name: 'webhook',
  label: 'Webhook',
  description: `A secret URL; each POST or PUT to it is a change, with its body as the detail. ${reach}.`,
  input,
  describe: () => 'Calls to a webhook URL',
  async start(_, context) {
    const saved = route.safeParse(context.state)
    const secret = saved.success ? saved.data.secret : randomSecret(24)
    if (!saved.success) context.save({ secret })
    const path = `${hookPath}${secret}`
    const stop = server.route(path, (request, caller) => receive(request, caller, context), { public: true })
    const base = await origin()
    return { stop, info: { url: base ? new URL(path, base).href : path, reach: base && !isLoopback(base) ? reach : localReach } }
  },
})
