import type { DeviceKind, DeviceRecord, JoinOutcome, JoinRequest, PairSettled } from '@sand/devices-contract'
import { newNonce } from '@sand/devices-identity'

const life = 2 * 60_000
const keepSettled = 2 * 60_000
const nameLimit = 80

export interface JoinAsk {
  publicKey: string
  name: string
  kind: DeviceKind
  platform: string
}

interface Entry {
  request: JoinRequest
  publicKey: string
  settled?: PairSettled
  settledAt?: number
}

const randomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0]! % 10_000).padStart(4, '0')

const cleanName = (name: string, kind: DeviceKind) => name.trim().slice(0, nameLimit).trim() || (kind === 'pc' ? 'PC' : 'New device')

export const createIncoming = (pc: () => { id: string; name: string }) => {
  const entries = new Map<string, Entry>()

  const isPending = (entry: Entry) => !entry.settled && entry.request.expires > Date.now()

  const pendingFor = (publicKey: string) => [...entries.values()].find(entry => entry.publicKey === publicKey && isPending(entry))?.request

  const open = (ask: JoinAsk, address: string) => {
    const now = Date.now()
    const { id: owner, name: pcName } = pc()
    const request: JoinRequest = {
      id: newNonce(),
      pc: owner,
      pcName,
      code: randomCode(),
      name: cleanName(ask.name, ask.kind),
      kind: ask.kind,
      platform: ask.platform.slice(0, nameLimit),
      address,
      created: now,
      expires: now + life,
    }
    entries.set(request.id, { request, publicKey: ask.publicKey })
    return request
  }

  const settle = (id: string, outcome: JoinOutcome, by?: string, device?: DeviceRecord) => {
    const entry = entries.get(id)
    if (!entry) return
    entry.settled = { id, pc: entry.request.pc, outcome, ...(by && { by }), ...(device && { device }) }
    entry.settledAt = Date.now()
    return entry.settled
  }

  const expire = () => {
    const now = Date.now()
    const expired: PairSettled[] = []
    for (const [id, entry] of entries) {
      if (entry.settledAt !== undefined && now - entry.settledAt > keepSettled) entries.delete(id)
      else if (!entry.settled && entry.request.expires <= now) expired.push(settle(id, 'expired')!)
    }
    return expired
  }

  return {
    open,
    pendingFor,
    settle,
    expire,
    get: (id: string) => entries.get(id),
    pending: () => [...entries.values()].filter(isPending).map(entry => entry.request),
    isPending: (id: string) => {
      const entry = entries.get(id)
      return Boolean(entry && isPending(entry))
    },
  }
}

export type Incoming = ReturnType<typeof createIncoming>
