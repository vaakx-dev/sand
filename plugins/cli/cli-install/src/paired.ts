import { errorMessage } from '@sand/kit'
import { dim, done, notice } from '@sand/kit/host'
import type { Daemon } from '@sand/protocol'
import { waitForAccounts } from './accounts'
import { UnhealthyError, waitForHealth } from './health'
import type { Installer } from './installer'
import { joinPcs } from './pair'
import { copyPlugins } from './plugins'
import { reportDone, reportFail, reportSharing } from './remote'
import { checkInstalled, installedRoot, openSand, placeApp, printFailure, skipStart, startHost } from './steps'

export interface Pairing {
  base: string
  secret: string
}

const alreadyReported = 3

const noAccounts = (from: string) => `${from} shares no accounts yet: sign in under Settings → Accounts on either PC`

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const sendPlugins = async ({ base, secret }: Pairing, home: string) => {
  const { copied, kept, folder } = await copyPlugins({ base, secret, home })
  if (copied.length) done(`${plural(copied.length, 'plugin')} copied`, folder)
  if (kept.length) dim(`Kept ${plural(kept.length, 'plugin')} already on this PC: ${kept.join(', ')}`)
}

const shareAccounts = async (daemon: Daemon, { base, secret }: Pairing, from: { id: string; name: string }) => {
  await reportSharing(base, secret)
  const accounts = await waitForAccounts(daemon, from.id)
  if (accounts.length) done(`Using ${accounts.join(' and ')} from ${from.name}`)
  else notice(noAccounts(from.name))
  return accounts
}

const join = async (pairing: Pairing, { home, daemon }: Installer) => {
  const root = installedRoot()
  await checkInstalled(root, home)
  await sendPlugins(pairing, home)
  await placeApp(root, home)
  if (skipStart()) return false
  const info = await startHost(daemon)
  const joined = await joinPcs(daemon, info, pairing.base, pairing.secret)
  done(`Joined ${joined.name}`)
  await waitForHealth(daemon, info, home)
  await reportDone(pairing.base, pairing.secret, await shareAccounts(daemon, pairing, joined))
  return true
}

export const installPaired = async (pairing: Pairing, installer: Installer) => {
  try {
    if (!(await join(pairing, installer))) return
  } catch (error) {
    const message = errorMessage(error)
    await reportFail(pairing.base, pairing.secret, message, error instanceof UnhealthyError ? error : undefined)
    printFailure(message)
    process.exit(alreadyReported)
  }
  await openSand(installer)
}
