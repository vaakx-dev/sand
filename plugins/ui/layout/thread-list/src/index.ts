import { owned, place, pulse } from '@sand/dom'
import { definePlugin } from 'drydock'
import { threadNavList } from './nav-list'
import { currentPlace } from './palette/places'
import { newThreadPage } from './palette/projects'
import { sessionSource } from './palette/source'
import { switcher } from './switcher'

export default definePlugin({
  name: 'thread-list',
  description: 'Lists threads and unsent drafts in whatever nav host is loaded, and adds threads, projects and thread actions to the palette',
  inject: ['threads'],
  uses: {
    nav: 'shows a plain thread switcher at the top',
    composer: 'new thread does not focus the prompt',
    palette: 'threads and projects are not searchable, and New thread starts in the current folder',
    projects: 'only the current folder is offered for a new thread, and projects cannot be renamed or hidden',
    picker: 'projects cannot be renamed from the palette',
    syncFlows: 'a project with no copy on this PC starts on another PC instead of offering to clone or sync it',
    machines: 'threads from other PCs show no PC name',
    drafts: 'unsent new threads are not listed',
    jobs: 'threads whose background agents are still running look idle',
    branches: 'threads show their folder instead of their git branch',
  },
  apply(ctx) {
    const threads = ctx.threads
    const here = () => {
      const place = currentPlace(ctx)
      void threads.draft(place.path, place.device).then(() => ctx.composer?.focus())
    }
    const create = () => (ctx.palette ? ctx.palette.open(newThreadPage(ctx)) : here())
    const events = ['threads.change', 'thread.select', 'drafts.change', 'machines.change', 'projects.change', 'jobs.change', 'branches.change'] as const

    ctx.watch('nav', nav => {
      if (!nav) {
        const layer = ctx.layer()
        const changes = pulse(layer, [...events], ['drafts', 'jobs', 'branches'])
        place(layer, 'top', owned(layer, () => switcher(threadNavList(ctx), changes, create)), 1)
        return () => void layer.dispose()
      }
      const list = nav.list(threadNavList(ctx))
      const action = nav.action({ id: 'new-thread', label: 'New thread', icon: 'compose', order: 20, run: create })
      const update = () => list.update()
      const disposers = [...events.map(name => ctx.on(name, update)), ctx.watch('drafts', update), ctx.watch('jobs', update), ctx.watch('branches', update)]
      return () => {
        disposers.forEach(dispose => void dispose?.())
        action()
        list.dispose()
      }
    })
    ctx.watch('palette', palette => palette?.source(sessionSource(ctx)))
  },
})
