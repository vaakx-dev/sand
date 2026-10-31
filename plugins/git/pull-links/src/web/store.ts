import { pcHello, type Pcs, pcsChange, type Wire } from '@sand/devices-contract'
import { type GitHubClient, type PullRef, type PullSummary, samePull } from '@sand/github/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type LinkedThread, type PullLink, pullLinksAll, type ThreadPulls, threadPullsChange } from '../contract'

interface Entry {
  device: string
  links: PullLink[]
}

interface StoreParts {
  wire: Wire
  pcs: Pcs
  github: GitHubClient
}

export const linkStore = (ctx: Context, { wire, pcs, github }: StoreParts) => {
  const sessions = sig<ReadonlyMap<string, Entry>>(new Map())
  const loaded = sig<ReadonlySet<string>>(new Set())
  const loading = new Set<string>()

  const edit = (change: (next: Map<string, Entry>) => void) =>
    sessions.update(current => {
      const next = new Map(current)
      change(next)
      return next
    })

  const patch = (summary: PullSummary, device: string) => {
    const touched = [...sessions.get()].filter(([, entry]) => entry.device === device && entry.links.some(link => samePull(link, summary)))
    if (!touched.length) return
    edit(next => {
      for (const [session, entry] of touched)
        next.set(session, { device, links: entry.links.map(link => (samePull(link, summary) ? { ...link, summary } : link)) })
    })
  }

  const fill = (device: string, links: PullLink[]) => {
    for (const link of links) {
      if (link.summary) continue
      github
        .summary({ repo: link.repo, number: link.number }, device)
        .then(summary => patch(summary, device))
        .catch(error => ctx.report(error))
    }
  }

  const apply = (device: string, { session, links }: ThreadPulls) => {
    edit(next => next.set(session, { device, links }))
    fill(device, links)
  }

  const settle = (device: string, all: ThreadPulls[]) => {
    edit(next => {
      for (const [session, entry] of next) if (entry.device === device) next.delete(session)
      for (const { session, links } of all) next.set(session, { device, links })
    })
    loaded.update(devices => new Set(devices).add(device))
    for (const { links } of all) fill(device, links)
  }

  const load = (device: string) => {
    if (loading.has(device)) return
    loading.add(device)
    wire
      .call(pullLinksAll, {}, device)
      .then(all => settle(device, all))
      .catch(error => ctx.report(error))
      .finally(() => loading.delete(device))
  }

  const forgetRemoved = () => {
    const known = new Set(pcs.list().map(pc => pc.id))
    if ([...loaded.get()].every(device => known.has(device))) return
    edit(next => {
      for (const [session, entry] of next) if (!known.has(entry.device)) next.delete(session)
    })
    loaded.update(devices => new Set([...devices].filter(device => known.has(device))))
  }

  const localFirst = (a: LinkedThread, b: LinkedThread) => Number(pcs.get(b.device)?.home ?? false) - Number(pcs.get(a.device)?.home ?? false)

  const threadsOf = (pull: PullRef): LinkedThread[] =>
    [...sessions.get()]
      .flatMap(([session, { device, links }]) => {
        const link = links.find(each => samePull(each, pull))
        return link ? [{ session, device, watching: link.watching }] : []
      })
      .sort(localFirst)

  for (const pc of pcs.list()) if (pc.online) load(pc.id)
  ctx.on(pcHello, load)
  ctx.on(pcsChange, forgetRemoved)
  ctx.effect(() => wire.on(threadPullsChange, (payload, device) => apply(device, payload), { from: 'all' }))
  ctx.effect(() => github.onPullChange(patch))

  return {
    of: (session: string) => sessions.get().get(session)?.links ?? [],
    loaded: (device: string) => loaded.get().has(device),
    threadsOf,
    apply,
  }
}
