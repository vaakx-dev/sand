import { join } from 'node:path'
import { running } from '../../daemon/info'
import { start } from '../../daemon/start'
import { stop } from '../../daemon/stop'
import { readStamp } from '../../host/dist/build'
import { bunBinary, readBuildBun } from '../../host/dist/bun/home'
import { setCurrentApp } from '../../host/dist/layout'
import { appRoot } from '../../host/dist/root'
import { isChannel, loadStore } from '../../host/updates/store'
import { launch } from '../launch/launch'
import { allowThroughFirewall } from './firewall'
import { dim, done, notice } from './print'
import { putSandOnPath } from './shim'

const again = 'run the install command again'

export const installedRoot = () => appRoot(join(import.meta.dir, '..', '..', 'main.ts'))

export const checkInstalled = async (root: string, home: string) => {
  if (!(await readStamp(root))) throw new Error(`${root} is not an installed sand download; ${again}`)
  const version = await readBuildBun(root)
  if (!version || !(await Bun.file(bunBinary(home, version)).exists())) throw new Error(`sand's Bun is missing for ${root}; ${again}`)
}

const addToPath = async (home: string) => {
  const { changed, hint } = await putSandOnPath({ home })
  done(changed ? "Added 'sand' to PATH" : "'sand' is on PATH")
  if (hint) dim(hint)
}

const saveChannel = async (home: string) => {
  const channel = process.env.SAND_CHANNEL
  delete process.env.SAND_CHANNEL
  if (isChannel(channel)) await (await loadStore(home)).setChannel(channel)
}

export const placeApp = async (root: string, home: string) => {
  await setCurrentApp(home, root)
  await saveChannel(home)
  await addToPath(home)
}

export const skipStart = () => Boolean(process.env.SAND_NO_START)

export const startHost = async (home: string) => {
  await allowThroughFirewall(process.execPath)
  const found = await running(home)
  if (found) await stop(home)
  const info = await start(home)
  done(`Server ${found ? 'restarted' : 'started'} on port ${new URL(info.url).port}`)
  return info
}

export const openSand = async (home: string) => {
  notice('Opening sand in your browser…')
  await launch({ home })
}

export const printFailure = (text: string) => console.error(process.stderr.isTTY ? `\x1b[31m${text}\x1b[0m` : text)
