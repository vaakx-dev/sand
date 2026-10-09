import { definePlugin } from 'drydock'
import { devices } from './devices'

export default definePlugin({
  name: 'cli-devices',
  description: 'The sand devices command: lists paired devices, unpairs them and shows a pairing QR code',
  inject: ['cliCommands', 'daemon'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'devices',
        summary: 'list paired devices and show a one-time QR code and link to pair a phone',
        usage: [
          'sand devices                    list paired devices and show a one-time QR code and link to pair a phone',
          'sand devices remove <name>      unpair a device; it has to pair again to use sand',
          'sand devices lan [on | off]     show or change whether sand listens on the home network (on by default)',
        ].join('\n'),
        run: args => devices(ctx.daemon, args),
      }),
    )
  },
})
