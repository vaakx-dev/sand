import { installCancel, installCreate, type InstallGrant, installList, type InstallPlatform, type InstallProgress, installProgress } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { UiContext } from '../inject'
import { feed } from './feed'

export const installsData = (ctx: UiContext) => {
  const progress = feed(() => ctx.wire.call(installList, {}), [] as InstallProgress[])
  const grants = sig<InstallGrant[]>([])
  const dismissed = sig(new Set<string>())

  ctx.effect(() =>
    ctx.wire.on(installProgress, update => {
      progress.value.update(all => [...all.filter(entry => entry.install !== update.install), update])
      grants.update(all => all.filter(grant => grant.id !== update.install))
    }),
  )

  const forget = (id: string) => {
    grants.update(all => all.filter(grant => grant.id !== id))
    progress.value.update(all => all.filter(entry => entry.install !== id))
  }

  return {
    progress,
    grants,
    running: (now: number) => progress.value.get().filter(entry => entry.stage !== 'ready' && entry.expires > now && !dismissed.get().has(entry.install)),
    waiting: (now: number) => grants.get().filter(grant => grant.expires > now),
    commandOf: (id: string) => grants.get().find(grant => grant.id === id)?.command,
    async create(platform: InstallPlatform, route: string) {
      const grant = await ctx.wire.call(installCreate, { platform, route })
      grants.update(all => [...all, grant])
      return grant
    },
    async cancel(id: string) {
      await ctx.wire.call(installCancel, { id })
      forget(id)
    },
    dismiss: (id: string) => dismissed.update(all => new Set([...all, id])),
  }
}

export type InstallsData = ReturnType<typeof installsData>
