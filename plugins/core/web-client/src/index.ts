import { remotesInvite } from '@sand/host-remotes/contract'
import { definePlugin } from 'drydock'
import { createCache } from './cache/service'
import {
  fileIndex,
  limits,
  machines as machinesService,
  media,
  models as modelsService,
  projects as projectsService,
  projectsChange,
  skillIndex,
  threads as threadsService,
  turns,
  wire as wireService,
} from './contract'
import { createFileIndex } from './data/files'
import { createLimits } from './data/limits'
import { createModels } from './data/models'
import { createProjects } from './data/projects'
import { createSkillIndex } from './data/skills'
import { createMedia } from './media/service'
import { bridgeRemotes } from './remotes/bridge'
import { createLinks } from './remotes/links'
import { createMachines } from './remotes/machines'
import { routeWire } from './remotes/route'
import { listenThreads } from './threads/events'
import { createThreads } from './threads/service'
import { Store } from './threads/store'
import { createTurns } from './threads/turns'
import { createHellos } from './wire/hellos'
import { pageHost } from './wire/host'
import { createListeners } from './wire/listeners'
import { startWire } from './wire/wire'

export default definePlugin({
  name: 'web-client',
  description:
    "Connects to sand and its paired PCs with this browser's own keys (pairing from #pair links, websocket tickets) and provides the chat, turns, models, limits, files, skills, projects and machines",
  apply(ctx) {
    const here = pageHost()
    const store = new Store(ctx, here)
    ctx.effect(() => () => store.dispose())
    const listeners = createListeners()
    const hellos = createHellos()
    const cache = createCache(ctx, store, () => home.pairing())
    const home = startWire(ctx, { cache, here, since: () => store.synced.get(here), listeners, hellos })
    const links = createLinks(id => home.call(remotesInvite, { remote: id }))
    ctx.effect(() => () => links.close())
    const wire = routeWire({ home, links, store, listeners, hellos })
    const machines = createMachines(ctx, { home, on: listeners.on, links, hereId: here, keep: remotes => cache.keep('remotes', remotes) })
    const projects = createProjects(ctx, wire, store)
    const threads = createThreads(ctx, wire, store, cache.hydrate)
    void cache.ready.then(() => {
      machines.restore(cache.saved('remotes'))
      projects.restore(cache.saved('projects'), store.devices())
      threads.restored()
    })
    ctx.on(projectsChange, () => cache.keep('projects', projects.kept()))
    const models = createModels(ctx, wire, threads, store)
    links.listen(bridgeRemotes(ctx, store, { threads, projects, models, listeners, hellos }))
    ctx.effect(() => listenThreads(wire, store, id => void threads.load(id)))
    ctx.provide(wireService, wire)
    ctx.provide(threadsService, threads)
    ctx.provide(turns, createTurns(wire, store))
    ctx.provide(modelsService, models)
    ctx.provide(limits, createLimits(ctx, wire))
    ctx.provide(fileIndex, createFileIndex(wire, threads.cwd))
    ctx.provide(skillIndex, createSkillIndex(ctx, wire, threads))
    ctx.provide(projectsService, projects.projects)
    ctx.provide(machinesService, machines.machines)
    ctx.provide(media, createMedia(wire, store))
  },
})
