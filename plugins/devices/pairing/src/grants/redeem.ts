import { type PairRefusal, type PairReply, pairJoined, type Registry, type ThisPc } from '@sand/devices-contract'
import type { HttpRoute } from '@sand/host-gateway/contract'
import type { Hub } from '@sand/host-hub/contract'
import { textReply } from '@sand/util/host'
import { pairBodySchema, readBody } from '../http/bodies'
import { json } from '../http/replies'
import type { Installs } from '../install/installs'
import { grantAccepts, type Grants } from './grants'

interface RedeemOptions {
  hub: Hub
  registry: Registry
  thisPc: ThisPc
  grants: Grants
  installs: Pick<Installs, 'paired'>
}

const refuse = (reason: PairRefusal['reason']) => json({ reason } satisfies PairRefusal, 403)

const originOf = (request: Request) => request.headers.get('origin') || undefined

export const redeemRoute = ({ hub, registry, thisPc, grants, installs }: RedeemOptions): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const body = await readBody(call.request, pairBodySchema)
    if (!body) return textReply('expected {token, publicKey, name, kind, platform} as JSON', 400)
    const grant = grants.find(body.token)
    if (!grant) return refuse('invalid')
    const target = grant.device ? registry.get(grant.device) : undefined
    if (grant.kind === 'handoff' && (!target || target.removed)) return refuse('invalid')
    if (!grantAccepts(grant, body.kind, target?.kind)) return refuse('wrong-kind')
    grants.take(body.token)
    const origin = body.kind === 'pc' ? undefined : originOf(call.request)
    const device = target
      ? await registry.addKey(target.id, { publicKey: body.publicKey, ...(origin && { origin }) }, grant.by)
      : await registry.add({ kind: body.kind, name: body.name, platform: body.platform, publicKey: body.publicKey, ...(origin && { origin }) }, grant.by)
    hub.broadcast(pairJoined, { token: body.token, device }, 'user')
    if (grant.install) installs.paired(grant.install, device)
    const reply: PairReply = { device, pc: await thisPc.identity() }
    return json(reply)
  },
})
