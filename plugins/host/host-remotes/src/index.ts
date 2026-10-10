import type { PairBack } from '@sand/host-devices/contract'
import { hostPaths } from '@sand/kit'
import { remoteStore } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { createChecks } from './link/check'
import { linkRoute } from './link/route'
import { createStatus } from './link/status'
import { pcList } from './pcs/list'
import { remoteRequests } from './requests'
import { createRemotes } from './service'

const every = 60_000

export default definePlugin({
  name: 'host-remotes',
  description: 'Other PCs running sand: pairs with them both ways, keeps the pairs linked and lists them as Your devices',
  inject: ['hostOptions', 'hub', 'hostDevices', 'hostHttp'],
  async apply(ctx) {
    const { home, device: self } = ctx.hostOptions
    const store = await remoteStore(home)
    const devices = ctx.hostDevices
    let queued = false
    const pcs = () => pcList(self, store.list(), devices.list(), status)
    const announce = () => {
      if (queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        ctx.hub.broadcast({ name: 'pcs.change', args: [pcs()] })
      })
    }
    const status = createStatus(announce)
    const urls = () => ctx.hostHttp.urls()
    const remotes = createRemotes({
      store,
      self,
      devices,
      status,
      urls,
      changed: list => {
        ctx.hub.broadcast({ name: 'remotes.change', args: [list] })
        announce()
      },
    })
    const checks = createChecks({ self, urls, store, devices, status, renamed: () => ctx.hub.broadcast({ name: 'remotes.change', args: [remotes.list()] }) })
    const accept = async (back: PairBack, address?: string) => {
      const stored = await remotes.accept(back, address)
      if (stored) setTimeout(() => void checks.one(back.device.id), 500)
      return stored
    }
    ctx.provide('hostRemotes', {
      list: remotes.list,
      add: async link => {
        const added = await remotes.add(link)
        setTimeout(() => void checks.one(added.id), 500)
        return added
      },
      accept,
    })
    for (const setup of remoteRequests(ctx.hub, remotes, checks, pcs)) ctx.effect(setup)
    ctx.effect(() => ctx.hostHttp.route(hostPaths.pairLink, linkRoute({ self, store, devices, status, accept, learn: remotes.learn })))
    ctx.effect(() =>
      devices.onChange(removed => {
        announce()
        if (removed) void remotes.removed(removed).catch(() => {})
      }),
    )
    ctx.effect(() => {
      const timer = setInterval(() => void checks.round(), every)
      const first = setTimeout(() => void checks.round(), 2000)
      return () => {
        clearInterval(timer)
        clearTimeout(first)
      }
    })
  },
})
