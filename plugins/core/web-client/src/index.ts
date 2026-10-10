import type { RemoteInvite } from '@sand/host-remotes/contract'
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
import { createMachines, machineChanges } from './remotes/machines'
import { routeWire } from './remotes/route'
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
    const local = startWire(ctx, machineChanges(ctx))
    const links = createLinks(id => local.call<RemoteInvite>({ type: 'remotes.invite', remote: id }))
    ctx.effect(() => () => links.close())
    const wire = routeWire(local, links, store)
    const threads = createThreads(ctx, wire, store)
    const projects = createProjects(ctx, wire, store)
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
  },
})
