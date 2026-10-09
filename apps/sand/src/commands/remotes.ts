import type { Remote } from '@sand/protocol'
import { ask } from '../daemon/ask'
import { listCommand } from './list'

export const remotes = listCommand<Remote>({
  usage: 'usage: sand remote [add <pairing link> | remove <pc>]',
  empty: 'no other PCs yet; on the other PC open Settings → Your PCs → Add a PC → It already has sand (or run `sand devices`) and pass its link to `sand remote add <pairing link>`',
  describe: remote => `${remote.name}  ${remote.url}`,
  list: info => ask<Remote[]>(info, { type: 'remotes.list' }),
  find: (listed, value) => listed.find(remote => remote.name.toLowerCase() === value.toLowerCase() || remote.id === value),
  add: async (info, link) => `paired with ${(await ask<Remote>(info, { type: 'remotes.add', link })).name}`,
  async remove(info, remote) {
    await ask(info, { type: 'remotes.remove', remote: remote.id })
    return `removed ${remote.name}`
  },
})
