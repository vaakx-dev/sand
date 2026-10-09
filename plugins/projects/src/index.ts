import { sandHome } from '@sand/host'
import { definePlugin } from 'drydock'
import { projectCommand } from './command'
import { serveIcons } from './serve'

export default definePlugin({
  name: 'projects',
  description: 'Project icons and a read-only /project list; the host owns the project registry',
  inject: ['sessions'],
  uses: { server: 'project icons are not served', ui: 'no /project command' },
  apply(ctx) {
    const home = sandHome(ctx)
    ctx.watch('server', server => server && serveIcons(server, home))
    ctx.watch('ui', ui => ui?.command(projectCommand(ui, home, () => ctx.sessions.list())))
  },
})
