import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { definePlugin } from 'drydock'
import { daemon } from '../contract'
import { stop } from '../control/stop'
import { daemonService } from './service'

export default definePlugin({
  name: 'host-daemon',
  description: 'Starts, finds and stops the background sand for the commands, and the sand stop command',
  inject: { cli, cliCommands },
  apply(ctx) {
    const { home } = ctx.cli
    ctx.provide(daemon, daemonService(home))
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'stop',
        summary: 'stop the background sand',
        usage: [
          'sand serve                      run sand in the foreground (it restarts plugins without dropping the page)',
          'sand stop                       stop the background sand',
        ].join('\n'),
        run: () => stop(home),
      }),
    )
  },
})
