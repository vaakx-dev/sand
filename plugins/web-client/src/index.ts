import { definePlugin } from 'drydock'
import { createFileIndex } from './data/files'
import { createJobs } from './data/jobs'
import { createLimits } from './data/limits'
import { createModels } from './data/models'
import { createProjects } from './data/projects'
import { createSkillIndex } from './data/skills'
import { createSync } from './data/sync'
import { bridgeRelay } from './relay/events'
import { bridgeRemotes } from './remotes/bridge'
import { createLinks } from './remotes/links'
import { createMachines } from './remotes/machines'
import { routeWire } from './remotes/route'
import { applyEvent } from './threads/events'
import { createThreads } from './threads/service'
import { Store } from './threads/store'
import { createTurns } from './threads/turns'
import { startWire } from './wire/wire'

export default definePlugin({
  name: 'web-client',
  description: 'Connects to the sand daemon and its paired PCs and provides threads, turns, jobs, models, limits, files, skills, projects and machines',
  uses: {
    notify: 'server notices go to the console',
    picker: 'server picks and inputs use the browser prompt',
    commands: 'server commands are not listed',
    composer: 'drafts and attachments from the server are dropped',
  },
  apply(ctx) {
    const store = new Store(ctx)
    ctx.effect(() => () => store.dispose())
    const links = createLinks()
    ctx.effect(() => () => links.close())
    const wire = routeWire(startWire(ctx), links, store)
    const threads = createThreads(ctx, wire, store)
    const projects = createProjects(ctx, wire)
    links.listen(bridgeRemotes(ctx, store, wire, threads, projects))
    ctx.on('wire.event', event => applyEvent(store, event, id => void threads.load(id)))
    bridgeRelay(ctx, wire, threads, threads.adopt)
    ctx.provide('wire', wire)
    ctx.provide('threads', threads)
    ctx.provide('turns', createTurns(wire, store))
    ctx.provide('jobs', createJobs(ctx, wire))
    ctx.provide('models', createModels(ctx, wire, threads, store))
    ctx.provide('limits', createLimits(ctx, wire))
    ctx.provide('fileIndex', createFileIndex(wire, threads.cwd))
    ctx.provide('skillIndex', createSkillIndex(ctx, wire))
    ctx.provide('projects', projects.projects)
    ctx.provide('machines', createMachines(ctx, wire, links))
  },
})
