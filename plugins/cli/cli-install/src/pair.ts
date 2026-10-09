import type { InstallPairRequest } from '@sand/host-dist/contract'
import type { Remote } from '@sand/host-remotes/contract'
import type { Daemon, ServerInfo } from '@sand/protocol'
import { createInvite, errorMessage, fetchHostIdentity } from '@sand/kit'
import { firewallHint, notice } from '@sand/kit/host'
import { pairWithOld } from './remote'

const windowsAttempts = 3

const pairWithRetry = async (base: string, secret: string, request: InstallPairRequest) => {
  if (process.platform !== 'win32') return pairWithOld(base, secret, request)
  for (let attempt = 1; ; attempt++) {
    try {
      return await pairWithOld(base, secret, request)
    } catch (error) {
      if (attempt >= windowsAttempts) throw new Error(`${errorMessage(error)}. ${firewallHint}`)
      notice('The other PC could not reach this one yet. If Windows Firewall asks, allow Bun on private networks. Trying again…')
      await Bun.sleep(10_000)
    }
  }
}

export const joinPcs = async (daemon: Daemon, info: ServerInfo, base: string, secret: string) => {
  const { links } = await createInvite(info.url, info.key)
  const { name } = await fetchHostIdentity(info.url)
  const result = await pairWithRetry(base, secret, { name, links })
  const remotes = await daemon.request<Remote[]>({ type: 'remotes.list' }, { to: info })
  if (!remotes.some(remote => remote.id === result.id)) throw new Error(`${result.name} paired with this PC, but this PC can't reach it back. ${firewallHint}`)
  return result
}
