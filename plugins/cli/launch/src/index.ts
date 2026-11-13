import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { launch, serve } from './launch'
import { sandbox } from './sandbox'

export default definePlugin({
  name: 'cli-launch',
  description: 'The sand and sand serve commands: start sand in the background if needed, and open it in the browser or print its paired link',
  inject: { cli, cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'launch',
        default: true,
        summary: 'start sand in the background if needed and open it in the browser',
        usage: [
          'sand [--safe]    start sand in the background if needed and open it in the browser,',
          '                 already paired so it needs no link or QR code',
        ].join('\n'),
        run: () => launch(ctx.daemon, ctx.cli.safe),
      }),
    )
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'serve',
        summary: 'start sand in the background if needed and print its paired link, opening nothing',
        usage: [
          'sand serve [--safe]             start sand in the background if needed and print a link that opens it paired;',
          '                                it opens nothing, so scripts and agents use it',
        ].join('\n'),
        run: () => serve(ctx.daemon, ctx.cli.safe),
      }),
    )
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'sandbox',
        summary: 'start a throwaway sand for testing and print its paired link',
        usage: [
          'sand sandbox     start a throwaway sand from this build in a temp home, on a free port and off the network,',
          '                 with your plugins, model and sandbox.toml settings, and print a link that opens it paired',
        ].join('\n'),
        run: () => sandbox(ctx.daemon, ctx.cli.home),
      }),
    )
  },
})
