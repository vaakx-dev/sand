import { errorMessage } from '@sand/kit'
import type { ServerInfo } from '@sand/protocol'
import { waitForAccounts } from './accounts'
import { UnhealthyError, waitForHealth } from './health'
import { joinPcs } from './pair'
import { copyPlugins } from './plugins'
import { dim, done, notice } from './print'
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

const shareAccounts = async (info: ServerInfo, { base, secret }: Pairing, from: { id: string; name: string }) => {
  await reportSharing(base, secret)
  const accounts = await waitForAccounts(info, from.id)
  if (accounts.length) done(`Using ${accounts.join(' and ')} from ${from.name}`)
  else notice(noAccounts(from.name))
  return accounts
}

const join = async (pairing: Pairing, home: string) => {
  const root = installedRoot()
  await checkInstalled(root, home)
  await sendPlugins(pairing, home)
  await placeApp(root, home)
  if (skipStart()) return false
  const info = await startHost(home)
  const joined = await joinPcs(info, pairing.base, pairing.secret)
  done(`Joined ${joined.name}`)
  await waitForHealth(info, home)
  await reportDone(pairing.base, pairing.secret, await shareAccounts(info, pairing, joined))
  return true
}

export const installPaired = async (pairing: Pairing, home: string) => {
  try {
    if (!(await join(pairing, home))) return
  } catch (error) {
    const message = errorMessage(error)
    await reportFail(pairing.base, pairing.secret, message, error instanceof UnhealthyError ? error : undefined)
    printFailure(message)
    process.exit(alreadyReported)
  }
  await openSand(home)
}
