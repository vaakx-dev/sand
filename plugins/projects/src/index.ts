import type { Server } from '@sand/protocol'
import { expandHome } from '@sand/host'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { projectCommand } from './command'
import { later } from './later'
import { projectLibrary } from './library'
import { projectRoot } from './root'
import { serveProjects } from './serve'
import { projectStore } from './store'

export default definePlugin({
  name: 'projects',
  description: 'Every project folder opened on this PC: list, add, rename, hide and link them, clone a Git URL or start an empty project',
  inject: ['cli', 'sessions'],
  uses: { server: 'the page cannot list or change projects', ui: 'no /project command' },
  config: z.object({ root: z.string().default('~/Projects') }),
  async apply(ctx, config) {
    const store = await projectStore(join(ctx.cli.home, 'projects.json'))
    const root = await projectRoot(join(ctx.cli.home, 'project-root.json'), expandHome(config.root))
    let server: Server | undefined
    let sent = ''
    const library = projectLibrary({
      store,
      root,
      sessions: () => ctx.sessions.list(),
      changed: () => {
        const list = library.list()
        sent = JSON.stringify(list)
        server?.broadcast('projects.change', [list])
      },
    })
    const usage = later(() => {
      const list = library.list()
      const json = JSON.stringify(list)
      if (json === sent) return
      sent = json
      server?.broadcast('projects.change', [list])
    }, 200)
    ctx.on('session.update', usage.schedule)
    ctx.on('session.remove', usage.schedule)
    ctx.effect(() => usage.cancel)
    ctx.watch('server', found => {
      server = found
      if (!found) return
      const unserve = serveProjects(found, library)
      return () => {
        server = undefined
        unserve()
      }
    })
    ctx.watch('ui', ui => ui?.command(projectCommand(ui, library)))
  },
})
