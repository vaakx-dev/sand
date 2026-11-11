import { isPcUnavailable, pcHello, type Pcs, type Wire } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type ChangesLive, changesChange, changesList, type ThreadChanges } from '../contract'

interface Asked {
  session: string
  device: string
}

const askedKey = ({ session, device }: Asked) => `${device}\u0000${session}`

export const followChanges = (ctx: Context, link: Wire, pcs: Pcs) => {
  const byThread = sig<ReadonlyMap<string, ThreadChanges>>(new Map())
  const asked = new Map<string, Asked>()

  const put = (list: ThreadChanges[]) =>
    byThread.update(current => {
      const next = new Map(current)
      for (const change of list) next.set(change.session, change)
      return next
    })
  const failed = (error: unknown) => {
    if (!isPcUnavailable(error)) ctx.report(error)
  }
  const load = (pc: string, sessions?: string[]) => void link.call(changesList, sessions ? { sessions } : {}, pc).then(put, failed)
  const reload = (pc: string) => {
    load(pc)
    const mine = [...asked.values()].flatMap(ask => (ask.device === pc ? [ask.session] : []))
    if (mine.length) load(pc, mine)
  }

  for (const pc of pcs.list()) if (link.ready(pc.id)) load(pc.id)
  const stop = joinDisposers(
    ctx.on(pcHello, reload),
    link.on(changesChange, change => put([change]), { from: 'all' }),
  )

  const live: ChangesLive = {
    get(session, device) {
      const ask = device && { session, device }
      if (ask && !asked.has(askedKey(ask))) {
        asked.set(askedKey(ask), ask)
        untrack(() => load(device, [session]))
      }
      return byThread.get().get(session)
    },
  }
  return { live, stop }
}
