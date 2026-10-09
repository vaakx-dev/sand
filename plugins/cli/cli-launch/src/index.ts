import { definePlugin } from 'drydock'
import { launch } from './launch'

export default definePlugin({
  name: 'cli-launch',
  description: 'The sand command: starts sand in the background if needed and opens it in the browser',
  inject: ['cli', 'cliCommands', 'daemon'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'launch',
        summary: 'start sand in the background if needed and open it in the browser',
        usage: [
          'sand [-c | -r <id>] [--safe]    start sand in the background if needed and open it in the browser,',
          '                                already paired so it needs no link or QR code',
        ].join('\n'),
        run: (_, values) =>
          launch(ctx.daemon, {
            latest: values.continue === true,
            session: typeof values.resume === 'string' ? values.resume : undefined,
            safe: ctx.cli.safe,
          }),
      }),
    )
  },
})
