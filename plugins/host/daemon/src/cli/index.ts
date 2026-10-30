import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { definePlugin } from 'drydock'
import { daemon } from '../contract'
import { stop } from '../control/stop'
import { handoffCommand } from '../handoff/hand-off'
import { startVerified } from '../handoff/verify'
import { daemonService } from './service'

const stopCommand = async (home: string) => {
  const pid = await stop(home)
  console.log(pid ? `stopped sand (pid ${pid})` : 'sand is not running')
}

export default definePlugin({
  name: 'host-daemon',
  description: 'Starts, finds and stops the background sand for the commands, the sand stop command, and the hidden handoff command a restart uses to start and check this build',
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
        run: () => stopCommand(home),
      }),
    )
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: handoffCommand,
        summary: 'start this build in the background and exit 0 once it is healthy',
        hidden: true,
        run: () => startVerified(home),
      }),
    )
  },
})
