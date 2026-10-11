import { owned, place, pulse, type Nav } from '@sand/dom'
import { definePlugin, type Context } from 'drydock'
import { openDraft } from './draft'
import { lookupEpoch } from './nav/epoch'
import { threadNavList } from './nav/list'
import { currentPlace } from './palette/places'
import { newThreadPage } from './palette/projects'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'
import { switcher } from './switcher'

type Ctx = Context<'threads'>

const events = ['threads.change', 'thread.select', 'drafts.change', 'machines.change', 'projects.change', 'jobs.change', 'branches.change', 'worktrees.change'] as const
const roles = ['drafts', 'jobs', 'branches', 'worktrees'] as const

const switcherBar = (ctx: Ctx, epoch: () => number, create: () => void) => {
  const layer = ctx.layer()
  const changes = pulse(layer, [...events], [...roles])
  place(layer, 'top', owned(layer, () => switcher(threadNavList(ctx, epoch), changes, create)), 1)
  return () => void layer.dispose()
}

const navThreads = (ctx: Ctx, nav: Nav, epoch: () => number, create: () => void) => {
  const list = nav.list(threadNavList(ctx, epoch))
  const action = nav.action({ id: 'new-thread', label: 'New thread', icon: 'compose', order: 20, run: create })
  const update = () => list.update()
  const disposers = [...events.map(name => ctx.on(name, update)), ...roles.map(role => ctx.watch(role, update)), wakeTimer(ctx, update)]
  return () => {
    disposers.forEach(dispose => void dispose?.())
    action()
    list.dispose()
  }
}

export default definePlugin({
  name: 'thread-list',
  description: 'Lists threads and unsent drafts in whatever nav host is loaded, and adds threads, projects and thread actions to the palette',
  inject: ['threads'],
  uses: {
    nav: 'shows a plain thread switcher at the top',
    composer: 'new thread does not focus the prompt',
    palette: 'threads and projects are not searchable, and New thread starts in the current folder',
    projects: 'only the current folder is offered for a new thread, and projects cannot be renamed or hidden',
    picker: 'projects cannot be renamed from the palette, and threads cannot be renamed from their menu without the palette',
    syncFlows: 'a project with no copy on this PC starts on another PC instead of offering to clone or sync it',
    machines: 'threads from other PCs show no PC name',
    drafts: 'unsent new threads are not listed',
    jobs: 'threads whose background agents are still running look idle',
    branches: 'threads show their folder instead of their git branch',
    worktrees: 'threads in a git worktree show no worktree icon',
    commands: 'the palette offers no fork or model rows for the thread',
    models: 'the palette model row shows no current model',
    wire: 'thread menus offer no Regenerate name',
    notify: 'failed thread actions and copies are not reported',
  },
  apply(ctx) {
    const draftHere = () => {
      const here = currentPlace(ctx)
      void openDraft(ctx, here.path, here.device)
    }
    const create = () => (ctx.palette ? ctx.palette.open(newThreadPage(ctx)) : draftHere())
    const epoch = lookupEpoch(ctx)
    ctx.watch('nav', nav => (nav ? navThreads(ctx, nav, epoch, create) : switcherBar(ctx, epoch, create)))
    ctx.watch('palette', palette => palette?.source(sessionSource(ctx)))
  },
})
