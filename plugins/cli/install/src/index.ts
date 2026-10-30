import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'cli-install',
  description: 'The sand install command: sets up a downloaded sand, optionally joining your other PCs',
  inject: { cli, cliCommands, daemon },
  apply(ctx) {
    const open = async () => {
      const launch = ctx.cliCommands.list().find(command => command.name === 'launch')
      if (!launch) throw new Error('no plugin provides the launch command, so sand cannot open the browser')
      await launch.run([], {})
    }
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'install',
        summary: 'set up a downloaded sand',
        usage: [
          'sand install                    set up a downloaded sand (the installer runs this); with',
          '                                SAND_JOIN=<link from Add a PC>, add this PC to your PCs',
        ].join('\n'),
        run: async args => (await import('./install')).installCommand({ home: ctx.cli.home, daemon: ctx.daemon, open }, args),
      }),
    )
  },
})
