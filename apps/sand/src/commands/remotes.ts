import type { Remote } from '@sand/protocol'
import { ask } from '../daemon/ask'
import { listCommand } from './list'

export const remotes = listCommand<Remote>({
  usage: 'usage: sand remote [add <link> | remove <name>]',
  empty: 'no other PCs yet; sand remote add <link> pairs one',
  describe: remote => `${remote.name}  ${remote.url}`,
  list: info => ask<Remote[]>(info, { type: 'remotes.list' }),
  find: (listed, value) => listed.find(remote => remote.name.toLowerCase() === value.toLowerCase() || remote.id === value),
  add: async (info, link) => `connected ${(await ask<Remote>(info, { type: 'remotes.add', link })).name}`,
  async remove(info, remote) {
    await ask(info, { type: 'remotes.remove', id: remote.id })
    return `removed ${remote.name}`
  },
})
