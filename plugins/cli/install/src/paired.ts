import type { Daemon } from '@sand/host-daemon/contract'
import { dim, done, notice } from '@sand/host-dist/setup'
import { errorMessage, plural } from '@sand/util'
import { waitForAccounts } from './accounts'
import { UnhealthyError, waitForHealth } from './health'
import { joinOtherPc, type JoinedPc } from './join'
import { copyPlugins } from './plugins'
import { type JoinGrant, reportDone, reportFail, reportStep } from './remote'
import { checkInstalled, installedRoot, openSand, placeApp, printFailure, skipStart, startHost, type Installer } from './steps'

const alreadyReported = 3

const noAccounts = (from: string) => `${from} shares no accounts yet: sign in under Settings → Accounts on either PC`

const fetchPlugins = async (grant: JoinGrant, home: string) => {
  const { copied, kept, folder } = await copyPlugins(grant, home)
  if (copied.length) done(`${plural(copied.length, 'plugin')} copied`, folder)
  if (kept.length) dim(`Kept ${plural(kept.length, 'plugin')} already on this PC: ${kept.join(', ')}`)
}

const shareAccounts = async (daemon: Daemon, grant: JoinGrant, from: JoinedPc) => {
  await reportStep(grant, 'sharing')
  const accounts = await waitForAccounts(daemon, from.id)
  if (accounts.length) done(`Using ${accounts.join(' and ')} from ${from.name}`)
  else notice(noAccounts(from.name))
  return accounts
}

const joinYourPcs = async (grant: JoinGrant, { home, daemon }: Installer) => {
  const root = installedRoot()
  await checkInstalled(root, home)
  await fetchPlugins(grant, home)
  await placeApp(root, home)
  if (skipStart()) return false
  await startHost(daemon)
  await reportStep(grant, 'pairing')
  const joined = await joinOtherPc(daemon, grant)
  done(`Joined ${joined.name}`)
  await waitForHealth(daemon, home)
  await reportDone(grant, await shareAccounts(daemon, grant, joined))
  return true
}

export const installPaired = async (grant: JoinGrant, installer: Installer) => {
  try {
    if (!(await joinYourPcs(grant, installer))) return
  } catch (error) {
    const message = errorMessage(error)
    await reportFail(grant, message, error instanceof UnhealthyError ? error : undefined)
    printFailure(message)
    process.exit(alreadyReported)
  }
  await openSand(installer)
}
