import { peers, thisPc } from '@sand/devices-contract'
import { gitRunner } from '@sand/git/contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { homedir } from 'node:os'
import { sep } from 'node:path'
import { projectsChange } from './contract'
import { iconSync } from './icons/sync'
import { seedSandHome } from './registry/home'
import { projectList } from './registry/list'
import { createRegistry } from './registry/registry'
import { projectRequests } from './registry/requests'
import { projectRoot } from './registry/root'
import { projectStore } from './registry/store'
import { projectSync } from './sync'

export default definePlugin({
  name: 'project',
  description: 'The project registry, its icons and its sync with paired PCs',
  inject: { hostOptions, hub, thisPc },
  async apply(ctx) {
    const { home } = ctx.hostOptions
    const device = ctx.thisPc.id
    const report = (error: unknown) => ctx.report(error)
    const store = await projectStore(home, report)
    await seedSandHome(store, home, device).catch(report)
    const root = await projectRoot(home)
    const list = () => projectList(store.all(), { device, home: homedir(), sep, root: root.get() })
    const placeChanged = () => ctx.hub.broadcast(projectsChange, list())

    const git = () => ctx.get(gitRunner)
    const registry = createRegistry(store, device, { changed: () => changed(), pull: () => sync.pull(), git })
    const icons = iconSync({ registry, device, home, peers: () => ctx.get(peers), git, report })
    ctx.effect(() => icons.close)
    const sync = projectSync(ctx, registry)
    const changed = () => {
      sync.changed()
      icons.changed()
      placeChanged()
    }

    for (const setup of projectRequests({ hub: ctx.hub, registry, root, list, placeChanged })) ctx.effect(setup)
    ctx.watch(gitRunner, found => {
      if (found) registry.refresh().catch(report)
    })
    icons.changed()
  },
})
