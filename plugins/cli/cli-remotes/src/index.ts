import { definePlugin } from 'drydock'
import { remotes } from './remotes'

export default definePlugin({
  name: 'cli-remotes',
  description: 'The sand remote command: lists, pairs and forgets other PCs running sand',
  inject: ['cliCommands', 'daemon'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'remote',
        summary: 'list, pair or forget other PCs running sand',
        usage: [
          'sand remote [add <pairing link> | remove <pc>]   list, pair or forget other PCs running sand;',
          '                                the pairing link comes from Devices (or `sand devices`) on the other PC',
        ].join('\n'),
        run: args => remotes(ctx.daemon, args),
      }),
    )
  },
})
