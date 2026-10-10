import type { Remote } from '@sand/host-remotes/contract'
import { listCommand } from './list'

export const remotes = listCommand<Remote>({
  usage: 'usage: sand remote [add <pairing link> | remove <pc>]',
  empty: 'no other PCs yet; on the other PC open Settings → Your devices → Add a PC → It already has sand (or run `sand devices`) and pass its link to `sand remote add <pairing link>`',
  describe: remote => `${remote.name}  ${remote.url}`,
  list: daemon => daemon.request<Remote[]>({ type: 'remotes.list' }),
  find: (listed, value) => listed.find(remote => remote.name.toLowerCase() === value.toLowerCase() || remote.id === value),
  add: async (daemon, link) => `paired with ${(await daemon.request<Remote>({ type: 'remotes.add', link })).name}`,
  async remove(daemon, remote) {
    await daemon.request({ type: 'remotes.remove', remote: remote.id })
    return `removed ${remote.name}`
  },
})
