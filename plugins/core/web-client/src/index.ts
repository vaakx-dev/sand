import type { RemoteInvite } from '@sand/host-remotes/contract'
import { definePlugin } from 'drydock'
import { createCache } from './cache/service'
import { createFileIndex } from './data/files'
import { createJobs } from './data/jobs'
import { createLimits } from './data/limits'
import { createModels } from './data/models'
import { createProjects } from './data/projects'
import { createSkillIndex } from './data/skills'
import { createSync } from './data/sync'
import { createMedia } from './media/service'
import { bridgeRelay } from './relay/events'
import { bridgeRemotes } from './remotes/bridge'
import { createLinks } from './remotes/links'
import { createMachines, machineChanges } from './remotes/machines'
import { routeWire, thisDevice } from './remotes/route'
import { devicesOf } from './remotes/sessions'
import { applyEvent } from './threads/events'
import { createThreads } from './threads/service'
import { Store } from './threads/store'
import { createTurns } from './threads/turns'
import { startWire } from './wire/wire'

export default definePlugin({
  name: 'web-client',
  description:
    "Connects to sand and its paired PCs with this browser's own keys (pairing from #pair links, websocket tickets) and provides threads, turns, jobs, models, limits, files, skills, projects and machines",
  uses: {
    notify: 'server notices go to the console',
    picker: 'server picks and inputs use the browser prompt',
    commands: 'server commands are not listed',
    composer: 'drafts and attachments from the server are dropped',
  },
  apply(ctx) {
    const store = new Store(ctx)
    ctx.effect(() => () => store.dispose())
    const cache = createCache(ctx, store, () => local.pairing())
    const local = startWire(ctx, machineChanges(ctx), () => store.synced.get(thisDevice), cache.gate, {
      load: () => cache.saved('hello'),
      save: saved => cache.keep('hello', saved),
    })
    const links = createLinks(id => local.call<RemoteInvite>({ type: 'remotes.invite', remote: id }))
    ctx.effect(() => () => links.close())
    const wire = routeWire(local, links, store)
    const threads = createThreads(ctx, wire, store, cache.hydrate)
    const projects = createProjects(ctx, wire, store)
    void cache.ready.then(() => {
      projects.restore(cache.saved('projects'), devicesOf(store))
      threads.restored()
    })
    ctx.on('projects.change', () => cache.keep('projects', projects.kept()))
    const jobs = createJobs(ctx, wire, store)
    links.listen(bridgeRemotes(ctx, store, wire, threads, projects, jobs))
    ctx.on('wire.event', event => applyEvent(store, event, id => void threads.load(id)))
    bridgeRelay(ctx, wire, threads, threads.adopt)
    ctx.provide('wire', wire)
    ctx.provide('threads', threads)
    ctx.provide('turns', createTurns(wire, store))
    ctx.provide('jobs', jobs.jobs)
    ctx.provide('models', createModels(ctx, wire, threads, store))
    ctx.provide('limits', createLimits(ctx, wire))
    ctx.provide('fileIndex', createFileIndex(wire, threads.cwd))
    ctx.provide('skillIndex', createSkillIndex(ctx, wire, threads))
    ctx.provide('projects', projects.projects)
    ctx.provide('machines', createMachines(ctx, wire, local, links))
    const media = createMedia(wire, store)
    ctx.effect(() => media.dispose)
    ctx.provide('media', media.media)
  },
})
