import { peers } from '@sand/devices-contract'
import type { hub } from '@sand/host-hub/contract'
import type { Context } from 'drydock'
import { projectsSync } from '../contract'
import type { Registry } from '../registry/registry'
import { cleanProjects } from './clean'
import { createRounds } from './rounds'

const settle = 1000
const every = 120_000

export const projectSync = (ctx: Context<{ hub: typeof hub }>, registry: Registry) => {
  const rounds = createRounds(() => ctx.get(peers), registry)
  let timer: Timer | undefined
  ctx.effect(() =>
    ctx.hub.handle(projectsSync, async input => {
      await registry.merge(cleanProjects(input.projects))
      return registry.all()
    }),
  )
  ctx.watch(peers, found => found?.onOpen(() => rounds.round(true)))
  ctx.effect(() => {
    const interval = setInterval(() => rounds.round(true), every)
    return () => {
      clearInterval(interval)
      clearTimeout(timer)
      rounds.stop()
    }
  })
  rounds.round(true)
  return {
    pull: rounds.pull,
    changed() {
      clearTimeout(timer)
      timer = setTimeout(() => rounds.round(false), settle)
    },
  }
}
