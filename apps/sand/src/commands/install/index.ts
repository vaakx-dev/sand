import { errorMessage } from '@sand/kit'
import type { ServerInfo } from '@sand/protocol'
import { join } from 'node:path'
import { running } from '../../daemon/info'
import { start } from '../../daemon/start'
import { stop } from '../../daemon/stop'
import { readStamp } from '../../host/dist/build'
import { bunBinary, readBuildBun } from '../../host/dist/bun/home'
import { setCurrentApp } from '../../host/dist/layout'
import { appRoot } from '../../host/dist/root'
import { launch } from '../launch/launch'
import { waitForAccounts } from './accounts'
import { allowThroughFirewall } from './firewall'
import { UnhealthyError, waitForHealth } from './health'
import { joinPcs } from './pair'
import { copyPlugins } from './plugins'
import { dim, done, notice } from './print'
import { reportDone, reportFail, reportSharing } from './remote'
import { putSandOnPath } from './shim'

const usage = 'usage: SAND_INSTALL_KEY=<secret> sand install <url>; copy the command from Add a PC on the other PC'

const takeSecret = () => {
  const secret = process.env.SAND_INSTALL_KEY
  delete process.env.SAND_INSTALL_KEY
  return secret
}

const again = 'run the command from Add a PC again'

const alreadyReported = 3

const noAccounts = (from: string) => `${from} shares no accounts yet: sign in under Settings → Accounts on either PC`

const checkInstalled = async (root: string, home: string) => {
  if (!(await readStamp(root))) throw new Error(`${root} is not an installed sand download; ${again}`)
  const version = await readBuildBun(root)
  if (!version || !(await Bun.file(bunBinary(home, version)).exists())) throw new Error(`sand's Bun is missing for ${root}; ${again}`)
}

const printFailure = (text: string) => console.error(process.stderr.isTTY ? `\x1b[31m${text}\x1b[0m` : text)

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const sendPlugins = async (base: string, secret: string, home: string) => {
  const { copied, kept, folder } = await copyPlugins({ base, secret, home })
  if (copied.length) done(`${plural(copied.length, 'plugin')} copied`, folder)
  if (kept.length) dim(`Kept ${plural(kept.length, 'plugin')} already on this PC: ${kept.join(', ')}`)
}

const shareAccounts = async (info: ServerInfo, base: string, secret: string, from: { id: string; name: string }) => {
  await reportSharing(base, secret)
  const accounts = await waitForAccounts(info, from.id)
  if (accounts.length) done(`Using ${accounts.join(' and ')} from ${from.name}`)
  else notice(noAccounts(from.name))
  return accounts
}

const addToPath = async (home: string) => {
  const { changed, hint } = await putSandOnPath({ home })
  done(changed ? "Added 'sand' to PATH" : "'sand' is on PATH")
  if (hint) dim(hint)
}

const startHost = async (home: string) => {
  const found = await running(home)
  if (found) await stop(home)
  const info = await start(home)
  done(`Server ${found ? 'restarted' : 'started'} on port ${new URL(info.url).port}`)
  return info
}

export const installCommand = async (home: string, args: string[]) => {
  const secret = takeSecret()
  const base = args[0]?.replace(/\/+$/, '')
  if (!base || !secret) throw new Error(usage)
  try {
    const root = appRoot(join(import.meta.dir, '..', '..', 'main.ts'))
    await checkInstalled(root, home)
    await sendPlugins(base, secret, home)
    await setCurrentApp(home, root)
    await addToPath(home)
    await allowThroughFirewall(process.execPath)
    const info = await startHost(home)
    const joined = await joinPcs(info, base, secret)
    done(`Joined ${joined.name}`)
    await waitForHealth(info, home)
    await reportDone(base, secret, await shareAccounts(info, base, secret, joined))
  } catch (error) {
    const message = errorMessage(error)
    await reportFail(base, secret, message, error instanceof UnhealthyError ? error : undefined)
    printFailure(message)
    process.exit(alreadyReported)
  }
  notice('Opening sand in your browser…')
  await launch({ home })
}
