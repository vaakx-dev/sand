import { definePlugin } from 'drydock'
import { homedir } from 'node:os'
import { join, sep } from 'node:path'
import { projectList } from './list'
import { createRegistry } from './registry'
import { projectRequests } from './requests'
import { projectRoot } from './root'
import { projectStore } from './store'

export default definePlugin({
  name: 'host-projects',
  description: 'The project registry: projects and their copies on each PC',
  inject: ['hostOptions', 'hub'],
  async apply(ctx) {
    const { home, device } = ctx.hostOptions
    const store = await projectStore(home, device.id)
    const root = await projectRoot(home)
    const place = () => ({ device: device.id, home: homedir(), sep, root: root.get(), scratch: join(home, 'scratch') })
    const list = () => projectList(store.all(), place())
    const placeChanged = () => ctx.hub.broadcast({ name: 'projects.change', args: [list()] })
    const registry = createRegistry(store, device.id, () => {
      ctx.emit('host.projects')
      placeChanged()
    })
    ctx.provide('hostProjects', { all: registry.all, merge: registry.merge })
    for (const setup of projectRequests({ hub: ctx.hub, registry, root, list, placeChanged })) ctx.effect(setup)
    registry.refresh().catch(() => {})
  },
})
