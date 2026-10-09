import { definePlugin } from 'drydock'
import { projectCommand } from './command'
import { serveIcons } from './serve'

export default definePlugin({
  name: 'projects',
  description: 'Project icons and a read-only /project list; the host owns the project registry',
  inject: ['projectFiles', 'sessions'],
  uses: { server: 'project icons are not served', ui: 'no /project command' },
  apply(ctx) {
    const files = ctx.projectFiles
    ctx.watch('server', server => server && serveIcons(server, files))
    ctx.watch('ui', ui => ui?.command(projectCommand(ui, files, () => ctx.sessions.list())))
  },
})
