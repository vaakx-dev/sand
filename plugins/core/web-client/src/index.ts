import { pcs, threadPcs, wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { createCache } from './cache/service'
import {
  fileIndex,
  limits,
  models as modelsService,
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
import { forgetRemovedPcs } from './pcs/forget'
import { threadPcsOf } from './pcs/thread-pcs'
import { listenThreads } from './threads/events'
import { createThreads } from './threads/service'
import { Store } from './threads/store'
import { createTurns } from './threads/turns'

export default definePlugin({
  name: 'web-client',
  description:
    "Keeps the threads, turns, models, limits, files, skills and projects of your PCs on the page, cached in this browser by PC, on top of the wire and the page's PCs",
  inject: { wire, pcs },
  apply(ctx) {
    const store = new Store(ctx, ctx.pcs.here().id)
    ctx.effect(() => () => store.dispose())
    ctx.provide(threadPcs, threadPcsOf(store))
    const cache = createCache(ctx, store, ctx.wire, ctx.pcs)
    const projects = createProjects(ctx, ctx.wire, ctx.pcs, store)
    const threads = createThreads(ctx, ctx.wire, ctx.pcs, store, cache.hydrate)
    void cache.ready.then(() => {
      projects.restore(cache.saved('projects'), store.devices())
      threads.restored()
    })
    ctx.on(projectsChange, () => cache.keep('projects', projects.kept()))
    const models = createModels(ctx, ctx.wire, ctx.pcs, threads, store)
    forgetRemovedPcs(ctx, store, ctx.pcs, { projects, models })
    ctx.effect(() => listenThreads(ctx.wire, store, id => void threads.load(id)))
    ctx.provide(threadsService, threads)
    ctx.provide(turns, createTurns(ctx.wire, store))
    ctx.provide(modelsService, models)
    ctx.provide(limits, createLimits(ctx, ctx.wire))
    ctx.provide(fileIndex, createFileIndex(ctx.wire, threads.cwd))
    ctx.provide(skillIndex, createSkillIndex(ctx, ctx.wire, threads))
    ctx.provide(projectsService, projects.projects)
  },
})
