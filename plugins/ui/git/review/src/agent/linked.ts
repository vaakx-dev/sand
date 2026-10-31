import type { PullRef } from '@sand/github/contract'
import type { PullLinksClient, ThreadPulls } from '@sand/pull-links/contract'
import type { ReviewContext } from '../inject'
import { sameRef } from '../pull/ref'

export interface LinkedThread {
  session: string
  device: string
}

const onlineDevices = (ctx: ReviewContext) =>
  ctx.pcs
    .list()
    .filter(pc => pc.online)
    .sort((a, b) => Number(b.home) - Number(a.home))
    .map(pc => pc.id)

const threadsOn = (links: PullLinksClient, device: string) => links.linksAll(device).catch((): ThreadPulls[] => [])

export const linkedThread = async (ctx: ReviewContext, links: PullLinksClient, ref: PullRef): Promise<LinkedThread | undefined> => {
  const devices = onlineDevices(ctx)
  const found = await Promise.all(devices.map(device => threadsOn(links, device)))
  for (const [index, threads] of found.entries()) {
    const thread = threads.find(each => each.links.some(link => sameRef(link, ref)))
    if (thread) return { session: thread.session, device: devices[index]! }
  }
  return undefined
}
