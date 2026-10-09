import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'cli-install',
  description: 'The sand install command: sets up a downloaded sand, optionally paired with another PC',
  inject: ['cli', 'cliCommands', 'daemon'],
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
          'sand install [<url>]            set up a downloaded sand (the installer runs this); with',
          '                                SAND_INSTALL_KEY=<secret> and the url of another PC, pair with it',
        ].join('\n'),
        run: async args => (await import('./install')).installCommand({ home: ctx.cli.home, daemon: ctx.daemon, open }, args),
      }),
    )
  },
})
