import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { launch } from './launch'

export default definePlugin({
  name: 'cli-launch',
  description: 'The sand command: starts sand in the background if needed and opens it in the browser',
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
  },
})
