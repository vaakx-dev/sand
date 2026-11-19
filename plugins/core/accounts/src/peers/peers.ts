import { type Peers as PcLinks, reachablePeers } from '@sand/devices-contract'
import type { Media } from '@sand/media/contract'
import { AccountGone, type Limits, type LLMEvent, type LLMRequest, ProviderTrouble, ThreadLost, UsageLimited } from '../contract'
import { isKeyKind, keyLabels } from '../auth/kinds'
import type { ShareInfo } from '../share/info'
import { peerCache, type CachedInfo, type PeerCache } from './cache'
import { gone, goneText, refused, transient, unreachableText } from './failure'
import { fetchInfo } from './info'
import { readEvents } from './lines'
import { carriedMedia } from './media'
import { openStream, type SharedRequest } from './open'
import type { SharePc } from './pc'
import { nextTry } from './reconnect'
import { Refused } from './refused'
import { tagged } from './tag'

export interface PeerState {
  pc: SharePc
  info?: CachedInfo
  limits: Limits[]
  online: boolean
  checked: boolean
  refused: boolean
  error?: string
}

export interface Pin {
  pc: string
  native?: boolean
  movable?(): boolean
}

interface PeersOptions {
  home: string
  media: Media
  links(): PcLinks | undefined
  changed(): void
  limitsChanged(limits: Limits): void
}

interface Opened {
  peer: PeerState
  body: ReadableStream<Uint8Array>
}

interface Missed {
  peer: PeerState
  error: unknown
}

const RECONNECT_GRACE_MS = 2 * 60_000

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const ownedBy = (pc: SharePc, { windows, status, updated, source }: Limits): Limits => ({
  source,
  pc: pc.id,
  pcName: pc.name,
  windows,
  ...(status && { status }),
  updated,
})

const rank = (state: PeerState) => (state.refused ? 2 : state.online ? 0 : 1)

export type Peers = ReturnType<typeof createPeers>

export const createPeers = ({ home, media, links, changed, limitsChanged }: PeersOptions) => {
  const cache = peerCache(home)
  const states = new Map<string, PeerState>()
  let saved: PeerCache = {}
  const wanted = new Map<string, boolean>()
  const running = new Map<string, Promise<void>>()
  let pcs: SharePc[] = []

  const state = (pc: SharePc) => {
    const found = states.get(pc.id)
    if (found) {
      found.pc = pc
      return found
    }
    const info = saved[pc.id]
    const fresh: PeerState = { pc, limits: [], online: false, checked: false, refused: false, ...(info && { info }) }
    states.set(pc.id, fresh)
    return fresh
  }

  const save = (next: PeerCache) => {
    saved = next
    void cache.write(next).catch(() => {})
  }

  const remember = (pc: SharePc, { limits: sent, ...info }: ShareInfo) => {
    const limits = sent.map(found => ownedBy(pc, found))
    const current = state(pc)
    const before = new Map(current.limits.map(found => [found.source, found]))
    Object.assign(current, { info, limits, online: true, checked: true, refused: false, error: undefined })
    limits.filter(found => !same(found, before.get(found.source))).forEach(limitsChanged)
    if (!same(saved[pc.id], info)) save({ ...saved, [pc.id]: info })
  }

  const fail = (pc: SharePc, error: unknown) => {
    const current = state(pc)
    current.checked = true
    if (error instanceof Refused && error.status === 401) Object.assign(current, { online: true, refused: true, error: `${pc.name} no longer accepts this PC — pair it again` })
    else if (error instanceof Refused) Object.assign(current, { online: true, refused: false, info: undefined, error: `${pc.name} doesn't share accounts` })
    else Object.assign(current, { online: false, error: undefined })
  }

  const check = async (found: PcLinks, pc: SharePc, limits: boolean) => {
    try {
      remember(pc, await fetchInfo(found, pc, limits))
    } catch (error) {
      fail(pc, error)
    }
  }

  const sync = (found: PcLinks) => {
    const before = JSON.stringify(pcs)
    pcs = found.list().map(({ id, name }) => ({ id, name }))
    const ids = new Set(pcs.map(pc => pc.id))
    for (const id of [...states.keys()]) if (!ids.has(id)) states.delete(id)
    if (Object.keys(saved).some(id => !ids.has(id))) save(Object.fromEntries(Object.entries(saved).filter(([id]) => ids.has(id))))
    pcs.forEach(state)
    return JSON.stringify(pcs) !== before
  }

  const checkWhileWanted = (found: PcLinks, pc: SharePc) => {
    const run = (async () => {
      for (let limits = wanted.get(pc.id); limits !== undefined; limits = wanted.get(pc.id)) {
        wanted.delete(pc.id)
        await check(found, pc, limits)
      }
      running.delete(pc.id)
      changed()
    })()
    running.set(pc.id, run)
    return run
  }

  const recheck = (found: PcLinks, pc: SharePc, limits: boolean) => {
    wanted.set(pc.id, limits || (wanted.get(pc.id) ?? false))
    return running.get(pc.id) ?? checkWhileWanted(found, pc)
  }

  const refresh = async (limits = false) => {
    const found = links()
    if (!found) return
    sync(found)
    await Promise.all(pcs.map(pc => recheck(found, pc, limits)))
  }

  const recheckPc = (id: string) => {
    const found = links()
    if (!found) return
    if (sync(found)) changed()
    const pc = pcs.find(known => known.id === id)
    if (pc) void recheck(found, pc, false)
  }

  const linksChanged = () => {
    const found = links()
    const listed = !!found && sync(found)
    const connected = new Set(found?.connected() ?? [])
    const lost = [...states.values()].filter(peer => peer.online && !connected.has(peer.pc.id))
    for (const peer of lost) Object.assign(peer, { online: false, error: undefined })
    if (listed || lost.length) changed()
  }

  const ready = cache.read().then(found => {
    saved = found
    const linked = links()
    if (linked) sync(linked)
    changed()
  })
  const first = ready.then(() => refresh())

  const list = () => pcs.map(state)
  const account = (peer: PeerState, id: string) => peer.info?.accounts.find(found => found.id === id)
  const candidates = (id: string) => list().filter(peer => account(peer, id)).sort((a, b) => rank(a) - rank(b))
  const source = (id: string) => candidates(id).find(peer => !peer.refused)
  const nameOf = (id: string) => (isKeyKind(id) ? keyLabels[id] : (list().flatMap(peer => account(peer, id) ?? [])[0]?.label ?? id))

  const labelOf = (peer: PeerState, id: string) => account(peer, id)?.label ?? nameOf(id)

  const dropped = (peer: PeerState, pin?: Pin) => (text: string, cause?: unknown) => {
    peer.online = false
    changed()
    return pin?.movable?.() ? new AccountGone(text, { cause }) : new ProviderTrouble(text, undefined, { cause })
  }

  const reached = (peer: PeerState) => {
    if (peer.online) return
    peer.online = true
    changed()
  }

  const missed = (peer: PeerState, error: unknown) => {
    if (!(error instanceof Refused) || error.status === 401 || error.status === 404) fail(peer.pc, error)
    changed()
  }

  const tryEach = async (peers: PeerState[], sent: SharedRequest, signal?: AbortSignal): Promise<Opened | Missed[]> => {
    const found = reachablePeers(links())
    const misses: Missed[] = []
    for (const peer of peers) {
      try {
        return { peer, body: await openStream(found, peer.pc, sent, signal) }
      } catch (error) {
        if (signal?.aborted) throw error
        missed(peer, error)
        misses.push({ peer, error })
      }
    }
    return misses
  }

  const outOfReach = (id: string, { peer, error }: Missed, pin?: Pin) => {
    const label = labelOf(peer, id)
    if (pin?.movable?.()) return new AccountGone(unreachableText(peer.pc.name, label), { cause: error })
    return gone(goneText(peer.pc.name, label, RECONNECT_GRACE_MS), error)
  }

  const given = (id: string, misses: Missed[], pin?: Pin) => {
    void refresh()
    const away = misses.find(miss => transient(miss.error))
    if (away) return outOfReach(id, away, pin)
    const refusal = misses.find((miss): miss is { peer: PeerState; error: Refused } => miss.error instanceof Refused)
    if (refusal) return refused(refusal.peer.pc.name, labelOf(refusal.peer, id), refusal.error)
    if (pin?.native) return new ThreadLost(`The PC that held this chat's ${nameOf(id)} session no longer shares it`)
    return new Error(`No paired PC shares ${nameOf(id)}`)
  }

  const open = async (id: string, sent: SharedRequest, signal?: AbortSignal, pin?: Pin): Promise<Opened> => {
    const giveUpAt = Date.now() + RECONNECT_GRACE_MS
    for (;;) {
      const tried = await tryEach(candidates(id).filter(candidate => !pin || candidate.pc.id === pin.pc), sent, signal)
      if (!Array.isArray(tried)) return tried
      const waiting = tried.filter(miss => transient(miss.error)).map(miss => miss.peer.pc.id)
      if (!waiting.length || pin?.movable?.() || Date.now() >= giveUpAt) throw given(id, tried, pin)
      await nextTry(links(), waiting, signal)
    }
  }

  async function* stream(id: string, request: LLMRequest, signal?: AbortSignal, pin?: Pin): AsyncGenerator<LLMEvent> {
    await first
    const { peer, body } = await open(id, { ...request, media: carriedMedia(media, request.messages) }, signal, pin)
    reached(peer)
    try {
      yield* tagged(readEvents(body, { name: peer.pc.name, signal, dropped: dropped(peer, pin) }), peer.pc)
    } catch (error) {
      if (error instanceof UsageLimited) await recheck(reachablePeers(links()), peer.pc, false)
      throw error
    }
  }

  return {
    ready,
    refresh,
    recheck: recheckPc,
    linksChanged,
    list,
    account,
    source,
    stream,
    limits: () => list().flatMap(peer => peer.limits),
  }
}
