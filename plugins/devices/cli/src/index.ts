import { cliCommands } from '@sand/cli-commands/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { devices, devicesUsage } from './devices'

export default definePlugin({
  name: 'devices-cli',
  description: 'The sand devices command: lists your PCs, phones and browsers, pairs new ones and answers join requests',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'devices',
        summary: 'list your PCs, phones and browsers, pair new ones and answer join requests',
        usage: devicesUsage,
        run: args => devices(ctx.daemon, args),
      }),
    )
  },
})
