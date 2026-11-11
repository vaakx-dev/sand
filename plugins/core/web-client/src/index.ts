import { pcs, threadPcs, wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { createCache } from './cache/service'
import {
  deviceCache,
  fileIndex,
  limits,
  models as modelsService,
  outbox,
  outboxChange,
  projects as projectsService,
  projectsChange,
  skillIndex,
  threads as threadsService,
  turns,
} from './contract'
import { createFileIndex } from './data/files'
import { createLimits } from './data/limits'
import { createModels } from './data/models'
import { createProjects } from './data/projects'
import { createSkillIndex } from './data/skills'
import { onPcHello } from './greeted'
import { outboxDb } from './integrations/outbox-db'
import { wireLink } from './outbox/link'
import { createOutbox } from './outbox/outbox'
import { forgetRemovedPcs } from './pcs/forget'
import { threadPcsOf } from './pcs/thread-pcs'
import { listenThreads } from './threads/events'
import { createThreads } from './threads/service'
import { Store } from './threads/store'
import { createTurns, markStarted } from './threads/turns'

export default definePlugin({
  name: 'web-client',
  description:
    "Keeps the threads, turns, models, limits, files, skills and projects of your PCs on the page, cached in this browser by PC with room for other plugins' records, and holds messages for PCs that can't be reached until they're back, on top of the wire and the page's PCs",
  inject: { wire, pcs },
  apply(ctx) {
    const store = new Store(ctx, ctx.pcs.here().id)
    ctx.effect(() => () => store.dispose())
    ctx.provide(threadPcs, threadPcsOf(store))
    const cache = createCache(ctx, store, ctx.wire, ctx.pcs)
    ctx.provide(deviceCache, cache.device)
    const keptProjects = cache.device.records<unknown>('projects')
    const projects = createProjects(ctx, ctx.wire, ctx.pcs, store)
    const threads = createThreads(ctx, ctx.wire, ctx.pcs, store, cache.hydrate)
    void Promise.all([keptProjects.read('lists'), cache.ready]).then(([kept]) => {
      projects.restore(kept, store.devices())
      threads.restored()
    })
    ctx.on(projectsChange, () => keptProjects.write('lists', projects.kept()))
    const models = createModels(ctx, ctx.wire, ctx.pcs, threads, store)
    forgetRemovedPcs(ctx, store, ctx.pcs, { projects, models })
    ctx.effect(() => listenThreads(ctx.wire, store, id => void threads.load(id)))
    ctx.provide(threadsService, threads)
    const outgoing = createOutbox({ link: wireLink(ctx.wire), saved: outboxDb, sent: markStarted(store), changed: () => ctx.emit(outboxChange) })
    onPcHello(ctx, ctx.wire, ctx.pcs, pc => void outgoing.greeted(pc))
    ctx.provide(outbox, outgoing.service)
    ctx.provide(turns, createTurns(ctx.wire, store, outgoing))
    ctx.provide(modelsService, models)
    ctx.provide(limits, createLimits(ctx, ctx.wire))
    ctx.provide(fileIndex, createFileIndex(ctx.wire, threads.cwd))
    ctx.provide(skillIndex, createSkillIndex(ctx, ctx.wire, ctx.pcs, threads))
    ctx.provide(projectsService, projects.projects)
  },
})
