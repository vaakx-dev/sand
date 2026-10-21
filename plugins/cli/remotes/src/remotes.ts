import type { Daemon } from '@sand/host-daemon/contract'
import { remotesAdd, remotesList, remotesRemove, type Remote } from '@sand/host-remotes/contract'

const usage = 'usage: sand remote [add <pairing link> | remove <pc>]'

const empty =
  'no other PCs yet; on the other PC open Settings → Your devices → Add a PC → It already has sand (or run `sand devices`) and pass its link to `sand remote add <pairing link>`'

const matches = (remote: Remote, value: string) => remote.name.toLowerCase() === value.toLowerCase() || remote.id === value

export const remotes = async (daemon: Daemon, [action, value]: string[]) => {
  await daemon.require()
  if (action === 'add' && value) {
    const added = await daemon.request(remotesAdd, { link: value })
    return console.log(`paired with ${added.name}`)
  }
  const listed = await daemon.request(remotesList, {})
  if (!action) return console.log(listed.length ? listed.map(remote => `${remote.name}  ${remote.url}`).join('\n') : empty)
  const found = value ? listed.find(remote => matches(remote, value)) : undefined
  if (action !== 'remove' || !found) throw new Error(usage)
  await daemon.request(remotesRemove, { remote: found.id })
  console.log(`removed ${found.name}`)
}
