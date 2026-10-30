import type { Peers as PcLinks } from '@sand/devices-contract'
import type { Media } from '@sand/media/contract'
import type { Limits, LLMEvent, LLMRequest } from '../contract'
import { isKeyKind, keyLabels } from '../auth/kinds'
import { rawMessage } from '../errors'
import type { ShareInfo } from '../share/info'
import { peerCache, type CachedInfo, type PeerCache } from './cache'
import { failure } from './failure'
import { fetchInfo } from './info'
import { readEvents } from './lines'
import { carriedMedia } from './media'
import { openStream } from './open'
import type { SharePc } from './pc'
import { Refused } from './refused'
import { tagged } from './tag'

export interface PeerState {
  pc: SharePc
  info?: CachedInfo
  limits?: Limits
  online: boolean
  checked: boolean
  refused: boolean
  error?: string
}

interface PeersOptions {
  home: string
  media: Media
  links(): PcLinks | undefined
  changed(): void
  limitsChanged(limits: Limits): void
}

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

const noLinks = () => new Error("This PC can't reach your other PCs right now")

export type Peers = ReturnType<typeof createPeers>

export const createPeers = ({ home, media, links, changed, limitsChanged }: PeersOptions) => {
  const cache = peerCache(home)
  const states = new Map<string, PeerState>()
  let saved: PeerCache = {}
  let pcs: SharePc[] = []
  let checking: Promise<void> | undefined

  const state = (pc: SharePc) => {
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

  const remember = (pc: SharePc, { limits: sent, ...info }: ShareInfo) => {
    const limits = sent && ownedBy(pc, sent)
    const current = state(pc)
    const before = current.limits
    Object.assign(current, { info, limits, online: true, checked: true, refused: false, error: undefined })
    if (limits && !same(limits, before)) limitsChanged(limits)
    if (!same(saved[pc.id], info)) save({ ...saved, [pc.id]: info })
  }

  const fail = (pc: SharePc, error: unknown) => {
    const current = state(pc)
    current.checked = true
    if (error instanceof Refused && error.status === 401) Object.assign(current, { online: true, refused: true, error: `${pc.name} no longer accepts this PC — pair it again` })
    else if (error instanceof Refused) Object.assign(current, { online: true, refused: false, info: undefined, error: `${pc.name} doesn't share accounts` })
    else Object.assign(current, { online: false, error: `${pc.name} is offline: ${rawMessage(error)}` })
  }

  const check = async (found: PcLinks, pc: SharePc, limits: boolean) => {
    try {
      remember(pc, await fetchInfo(found, pc, limits))
    } catch (error) {
      fail(pc, error)
    }
  }

  const sync = (found: PcLinks) => {
    pcs = found.list().map(({ id, name }) => ({ id, name }))
    const ids = new Set(pcs.map(pc => pc.id))
    for (const id of [...states.keys()]) if (!ids.has(id)) states.delete(id)
    if (Object.keys(saved).some(id => !ids.has(id))) save(Object.fromEntries(Object.entries(saved).filter(([id]) => ids.has(id))))
    pcs.forEach(state)
  }

  const run = async (limits: boolean) => {
    const found = links()
    if (!found) return
    sync(found)
    await Promise.all(pcs.map(pc => check(found, pc, limits)))
    changed()
  }

  const refresh = (limits = false) => (checking ??= run(limits).finally(() => (checking = undefined)))

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

  async function* stream(id: string, request: LLMRequest, signal?: AbortSignal, pc?: string): AsyncGenerator<LLMEvent> {
    await first
    const found = links()
    if (!found) throw noLinks()
    let problem: Error | undefined
    const sent = { ...request, media: carriedMedia(media, request.messages) }
    for (const peer of candidates(id).filter(candidate => !pc || candidate.pc.id === pc)) {
      const name = account(peer, id)?.label ?? nameOf(id)
      let body: ReadableStream<Uint8Array>
      try {
        body = await openStream(found, peer.pc, sent, signal)
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
      yield* tagged(readEvents(body, peer.pc.name, signal), peer.pc)
      return
    }
    void refresh()
    throw problem ?? new Error(`No paired PC shares ${nameOf(id)}`)
  }

  return {
    ready,
    refresh,
    list,
    account,
    source,
    stream,
    limits: () => list().flatMap(peer => (peer.limits && source(peer.limits.source) === peer ? [peer.limits] : [])),
  }
}
