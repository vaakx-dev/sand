import {
  type JoinBody,
  type OutgoingJoin,
  type OutgoingOutcome,
  pairJoinResult,
  type PcIdentity,
  type Peers,
  type Registry,
  type ThisPc,
} from '@sand/devices-contract'
import { newNonce } from '@sand/devices-identity'
import type { Hub } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { baseOf, tokenOf } from '../grants/links'
import { askToJoin, cancelJoin, fetchIdentity, joinStatus, postPair } from './remote'

const pollEvery = 2000
const grace = 15_000

interface OutgoingOptions {
  hub: Hub
  registry: Registry
  thisPc: ThisPc
  peers(): Peers | undefined
}

const withScheme = (url: string) => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `http://${url.trim()}`)

export const createOutgoing = ({ hub, registry, thisPc, peers }: OutgoingOptions) => {
  const joins = new Map<string, OutgoingJoin>()
  let stopped = false

  const me = (): JoinBody => ({ publicKey: thisPc.publicKey, name: thisPc.name(), kind: 'pc', platform: thisPc.platform })

  const trust = async (pc: PcIdentity, base: string, by: string) => {
    await registry.add({ kind: 'pc', name: pc.name, platform: pc.platform, publicKey: pc.publicKey, origin: base }, by)
    peers()?.retry(pc.id)
  }

  const droppedUs = (pc: string) => {
    const status = peers()?.get(pc)?.status
    return status?.phase === 'blocked' && status.reason === 'removed'
  }

  const tell = (id: string, pc: string, outcome: OutgoingOutcome, error?: string) =>
    hub.broadcast(pairJoinResult, { id, pc, outcome, ...(error && { error }) }, 'user')

  const sameKey = (identity: PcIdentity, answered: PcIdentity | undefined) => {
    if (answered?.publicKey !== identity.publicKey) throw new Error(`${identity.name} answered with a different key`)
  }

  const checkTarget = (identity: PcIdentity, expected?: string) => {
    if (expected && identity.id !== expected) throw new Error(`That address belongs to ${identity.name}, not the PC you chose`)
    if (identity.id === thisPc.id) throw new Error("That's this PC")
    const known = registry.get(identity.id)
    if (known && !known.removed && !droppedUs(identity.id)) throw new Error(`${identity.name} is already one of your PCs`)
  }

  const withToken = async (base: string, token: string, identity: PcIdentity, by: string): Promise<OutgoingJoin> => {
    const reply = await postPair(base, { token, ...me() })
    sameKey(identity, reply.pc)
    await trust(identity, base, by)
    const join: OutgoingJoin = { id: newNonce(), pc: identity.id, name: identity.name, code: '', url: base, expires: Date.now() }
    tell(join.id, join.pc, 'approved')
    return join
  }

  const settle = async (join: OutgoingJoin, identity: PcIdentity, by: string): Promise<OutgoingOutcome | undefined> => {
    for (;;) {
      await Bun.sleep(pollEvery)
      if (stopped || !joins.has(join.id)) return
      const late = Date.now() > join.expires + grace
      const status = await joinStatus(join.url, join.id).catch(error => {
        if (late) throw error
        return undefined
      })
      if (!status || status.phase === 'pending') {
        if (late) return 'expired'
        continue
      }
      if (status.phase !== 'approved') return status.phase
      sameKey(identity, status.pc)
      await trust(identity, join.url, by)
      return 'approved'
    }
  }

  const follow = async (join: OutgoingJoin, identity: PcIdentity, by: string) => {
    const outcome = await settle(join, identity, by).catch((error: unknown) => ({ failed: errorMessage(error) }))
    if (stopped || !joins.delete(join.id)) return
    if (outcome === undefined) return
    if (typeof outcome === 'string') tell(join.id, join.pc, outcome)
    else tell(join.id, join.pc, 'failed', outcome.failed)
  }

  const withRequest = async (base: string, identity: PcIdentity, by: string) => {
    const ticket = await askToJoin(base, me())
    const join: OutgoingJoin = { id: ticket.id, pc: identity.id, name: identity.name, code: ticket.code, url: base, expires: ticket.expires }
    joins.set(join.id, join)
    void follow(join, identity, by)
    return join
  }

  const join = async (url: string, expected: string | undefined, by: string) => {
    const full = withScheme(url)
    const base = baseOf(full)
    const token = tokenOf(full)
    const identity = await fetchIdentity(base)
    checkTarget(identity, expected)
    return token ? withToken(base, token, identity, by) : withRequest(base, identity, by)
  }

  const cancel = async (id: string) => {
    const join = joins.get(id)
    if (!join) return
    joins.delete(id)
    tell(id, join.pc, 'cancelled')
    await cancelJoin(join.url, id).catch(error => console.error(`pairing could not withdraw the request to ${join.name}: ${errorMessage(error)}`))
  }

  return {
    join,
    cancel,
    list: () => [...joins.values()],
    stop: () => {
      stopped = true
    },
  }
}

export type Outgoing = ReturnType<typeof createOutgoing>
