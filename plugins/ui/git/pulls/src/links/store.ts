import { pullsChange, pullsSummary, type PullSummary } from '@sand/github/contract'
import { type PullLink, pullLinks, pullLinksAll, threadPullsChange, type ThreadPulls } from '@sand/pull-links/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { PullsContext } from '../inject'
import { onReconnect } from '../reconnect'
import { samePull } from './rank'

type Listener = (links: PullLink[]) => void

interface Entry {
  device: string
  links: Sig<PullLink[]>
  listeners: Set<Listener>
}

export const linkStore = (ctx: PullsContext) => {
  const entries = new Map<string, Entry>()
  const wanted = new Set<string>()
  const loaded = new Set<string>()
  const loading = new Set<string>()
  const known = sig(0)
  const bump = () => known.update(value => value + 1)

  const entryOf = (session: string, device: string) => {
    const found = entries.get(session)
    if (found) {
      found.device = device
      return found
    }
    const made: Entry = { device, links: sig<PullLink[]>([]), listeners: new Set() }
    entries.set(session, made)
    bump()
    return made
  }

  const put = (entry: Entry, links: PullLink[]) => {
    entry.links.set(links)
    for (const listener of entry.listeners) listener(links)
  }

  const patch = (summary: PullSummary, device: string) => {
    for (const entry of entries.values()) {
      if (entry.device !== device || !entry.links.get().some(link => samePull(link, summary))) continue
      put(
        entry,
        entry.links.get().map(link => (samePull(link, summary) ? { ...link, summary } : link)),
      )
    }
  }

  const fill = (entry: Entry) => {
    for (const link of entry.links.get()) {
      if (link.summary) continue
      ctx.wire
        .call(pullsSummary, { repo: link.repo, number: link.number }, entry.device)
        .then(summary => patch(summary, entry.device))
        .catch(() => undefined)
    }
  }

  const apply = ({ session, links }: ThreadPulls, device: string) => {
    const entry = entryOf(session, device)
    put(entry, links)
    fill(entry)
  }

  const settleDevice = (device: string, all: ThreadPulls[]) => {
    const listed = new Set(all.map(item => item.session))
    for (const [session, entry] of entries) if (entry.device === device && !listed.has(session)) put(entry, [])
    for (const item of all) apply(item, device)
    loaded.add(device)
    bump()
  }

  const loadDevice = (device: string) => {
    if (loading.has(device)) return
    loading.add(device)
    ctx.wire
      .call(pullLinksAll, {}, device)
      .then(all => settleDevice(device, all))
      .catch(() => undefined)
      .finally(() => loading.delete(device))
  }

  const ensure = (session: string, device: string) => {
    const entry = entryOf(session, device)
    wanted.add(device)
    if (!loaded.has(device)) loadDevice(device)
    return entry
  }

  const follow = (session: string, device: string, listener: Listener): Dispose => {
    const entry = ensure(session, device)
    entry.listeners.add(listener)
    if (loaded.has(device)) listener(entry.links.get())
    return () => void entry.listeners.delete(listener)
  }

  const read = (session: string) => {
    known.get()
    return entries.get(session)?.links.get() ?? []
  }

  const isLoaded = (session: string) => {
    known.get()
    const entry = entries.get(session)
    return entry ? loaded.has(entry.device) : false
  }

  const reload = async (session: string) => {
    const entry = entries.get(session)
    if (!entry) return
    await ctx.wire
      .call(pullLinks, { session }, entry.device)
      .then(result => apply(result, entry.device))
      .catch(() => undefined)
  }

  ctx.effect(() => ctx.wire.on(threadPullsChange, (payload, device) => apply(payload, device), { from: 'all' }))
  ctx.effect(() => ctx.wire.on(pullsChange, (summary, device) => patch(summary, device), { from: 'all' }))
  onReconnect(ctx, device => {
    for (const each of wanted) if (!device || each === device) loadDevice(each)
  })

  return { ensure, follow, read, isLoaded, apply, patch, reload }
}

export type LinkStore = ReturnType<typeof linkStore>
