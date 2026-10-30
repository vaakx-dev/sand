import type { JoinRefusal, JoinStatus, JoinTicket, PublishedRoute, Registry, ThisPc } from '@sand/devices-contract'
import type { HttpCall, HttpRoute } from '@sand/host-gateway/contract'
import { textReply } from '@sand/util/host'
import { shareLinks } from '../grants/links'
import { cancelBodySchema, joinBodySchema, readBody } from '../http/bodies'
import { json } from '../http/replies'
import type { Decisions } from './decisions'
import type { Incoming } from './incoming'
import { createLimits } from './limits'

interface JoinRoutesOptions {
  registry: Registry
  thisPc: ThisPc
  incoming: Incoming
  decisions: Pick<Decisions, 'announceRequest' | 'withdraw'>
  routes(): PublishedRoute[]
}

const refuse = (reason: JoinRefusal['reason'], status: number) => json({ reason } satisfies JoinRefusal, status)

const nearby = new Set<HttpCall['reach']>(['loopback', 'private', 'tailscale'])

const isNearby = (call: HttpCall) => nearby.has(call.reach)

export const joinRoutes = ({ registry, thisPc, incoming, decisions, routes }: JoinRoutesOptions) => {
  const allow = createLimits()

  const ask: HttpRoute = {
    method: 'POST',
    async handle(call) {
      if (!isNearby(call) || !call.address) return refuse('not-private', 403)
      const body = await readBody(call.request, joinBodySchema)
      if (!body) return textReply('expected {publicKey, name, kind, platform} as JSON', 400)
      const known = registry.byKey(body.publicKey)
      if (known && !known.removed) return refuse('already-paired', 409)
      let request = incoming.pendingFor(body.publicKey)
      if (!request) {
        if (!allow(call.address)) return refuse('rate-limited', 429)
        request = incoming.open(body, call.address)
        decisions.announceRequest(request)
      }
      const ticket: JoinTicket = { id: request.id, code: request.code, expires: request.expires, approve: shareLinks(routes(), 'approve', request.id) }
      return json(ticket)
    },
  }

  const status = async (id: string): Promise<JoinStatus> => {
    const entry = incoming.get(id)
    if (!entry) return { phase: 'expired' }
    const settled = entry.settled
    if (!settled) return incoming.isPending(id) ? { phase: 'pending', expires: entry.request.expires } : { phase: 'expired' }
    if (settled.outcome === 'approved' && settled.device) return { phase: 'approved', device: settled.device, pc: await thisPc.identity() }
    return settled.outcome === 'denied' ? { phase: 'denied' } : { phase: 'expired' }
  }

  const poll: HttpRoute = {
    method: 'GET',
    prefix: true,
    async handle(call) {
      const id = decodeURIComponent(call.url.pathname.split('/').pop() ?? '')
      return json(await status(id))
    },
  }

  const cancel: HttpRoute = {
    method: 'POST',
    async handle(call) {
      const body = await readBody(call.request, cancelBodySchema)
      if (!body) return textReply('expected {id} as JSON', 400)
      decisions.withdraw(body.id)
      return new Response(null, { status: 204 })
    },
  }

  return { ask, poll, cancel }
}
