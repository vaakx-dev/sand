import type { LLMEvent, LLMRequest, Limits, LoginProvider } from '@sand/protocol'
import { accountName } from '../auth/accounts'
import { rawMessage } from '../errors'
import type { ShareInfo } from '../share/info'
import { peerCache, type CachedInfo, type PeerCache } from './cache'
import { failure } from './failure'
import { fetchInfo, findUrl, Offline, Refused } from './http'
import { readEvents } from './lines'
import { openStream } from './open'
import { readRemotes, type RemotePc } from './remotes'

export interface PeerState {
  pc: RemotePc
  info?: CachedInfo
  limits?: Limits
  online: boolean
  checked: boolean
  refused: boolean
  error?: string
}

export interface PeersOptions {
  home: string
  changed(): void
  limitsChanged(limits: Limits): void
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const rank = (state: PeerState) => (state.refused ? 2 : state.online ? 0 : 1)

export type Peers = ReturnType<typeof createPeers>

export const createPeers = ({ home, changed, limitsChanged }: PeersOptions) => {
  const cache = peerCache(home)
  const states = new Map<string, PeerState>()
  const bases = new Map<string, string>()
  let saved: PeerCache = {}
  let pcs: RemotePc[] = []
  let checking: Promise<void> | undefined

  const state = (pc: RemotePc) => {
    const found = states.get(pc.id)
    if (found) {
      found.pc = pc
      return found
    }
    const info = saved[pc.id]
    const fresh: PeerState = { pc, online: false, checked: false, refused: false, ...(info && { info }) }
    states.set(pc.id, fresh)
    return fresh
  }

  const save = (next: PeerCache) => {
    saved = next
    void cache.write(next).catch(() => {})
  }

  const remember = (pc: RemotePc, { limits, ...info }: ShareInfo) => {
    const current = state(pc)
    const before = current.limits
    Object.assign(current, { info, limits, online: true, checked: true, refused: false, error: undefined })
    if (limits && !same(limits, before)) limitsChanged(limits)
    if (!same(saved[pc.id], info)) save({ ...saved, [pc.id]: info })
  }

  const fail = (pc: RemotePc, error: unknown) => {
    const current = state(pc)
    current.checked = true
    bases.delete(pc.id)
    if (error instanceof Refused && error.status === 401) Object.assign(current, { online: true, refused: true, error: `${pc.name} no longer accepts this PC — pair it again` })
    else if (error instanceof Refused) Object.assign(current, { online: true, refused: false, info: undefined, error: `${pc.name} runs an older sand without account sharing` })
    else Object.assign(current, { online: false, error: `${pc.name} is offline: ${error instanceof Offline ? error.message : rawMessage(error)}` })
  }

  const connect = async (pc: RemotePc) => {
    const known = bases.get(pc.id)
    if (known) return known
    const url = await findUrl(pc)
    bases.set(pc.id, url)
    return url
  }

  const check = async (pc: RemotePc, limits: boolean) => {
    try {
      remember(pc, await fetchInfo(await connect(pc), pc, limits))
    } catch (error) {
      fail(pc, error)
    }
  }

  const sync = async () => {
    pcs = await readRemotes(home)
    const ids = new Set(pcs.map(pc => pc.id))
    for (const id of [...states.keys()]) {
      if (ids.has(id)) continue
      states.delete(id)
      bases.delete(id)
    }
    if (Object.keys(saved).some(id => !ids.has(id))) save(Object.fromEntries(Object.entries(saved).filter(([id]) => ids.has(id))))
    pcs.forEach(state)
  }

  const run = async (limits: boolean) => {
    await sync()
    await Promise.all(pcs.map(pc => check(pc, limits)))
    changed()
  }

  const refresh = (limits = false) => (checking ??= run(limits).finally(() => (checking = undefined)))

  const ready = cache.read().then(async found => {
    saved = found
    await sync()
    changed()
  })
  const first = ready.then(() => refresh())

  const list = () => pcs.map(state)
  const account = (peer: PeerState, provider: LoginProvider) => peer.info?.accounts.find(found => found.provider === provider)
  const candidates = (provider: LoginProvider) => list().filter(peer => account(peer, provider)).sort((a, b) => rank(a) - rank(b))
  const source = (provider: LoginProvider) => candidates(provider).find(peer => !peer.refused)

  async function* stream(provider: LoginProvider, request: LLMRequest, signal?: AbortSignal): AsyncGenerator<LLMEvent> {
    await first
    let problem: Error | undefined
    for (const peer of candidates(provider)) {
      const name = accountName(provider, account(peer, provider)?.method)
      let body: ReadableStream<Uint8Array>
      try {
        body = await openStream(peer.pc, request, signal, { connect, forget: () => bases.delete(peer.pc.id) })
      } catch (error) {
        if (signal?.aborted) throw error
        problem ??= failure(peer.pc.name, name, error)
        if (!(error instanceof Refused) || error.status === 401 || error.status === 404) fail(peer.pc, error)
        changed()
        continue
      }
      if (!peer.online) {
        peer.online = true
        changed()
      }
      yield* readEvents(body, peer.pc.name, signal)
      return
    }
    void refresh()
    throw problem ?? new Error(`No paired PC shares ${accountName(provider)}`)
  }

  return {
    ready,
    refresh,
    list,
    account,
    source,
    serves: (provider: LoginProvider) => candidates(provider).length > 0,
    stream,
    limits: () => source('anthropic')?.limits,
    price: (model: string) => list().find(peer => peer.info?.prices[model])?.info?.prices[model],
  }
}
