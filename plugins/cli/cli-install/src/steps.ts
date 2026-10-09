import type { Daemon } from '@sand/protocol'
import {
  allowThroughFirewall,
  appRoot,
  bunBinary,
  dim,
  done,
  isChannel,
  loadUpdateStore,
  notice,
  putSandOnPath,
  readBuildBun,
  readStamp,
  setCurrentApp,
} from '@sand/kit/host'
import type { Installer } from './installer'

const again = 'run the install command again'

export const installedRoot = () => appRoot(Bun.main)

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
  if (isChannel(channel)) await (await loadUpdateStore(home)).setChannel(channel)
}

export const placeApp = async (root: string, home: string) => {
  await setCurrentApp(home, root)
  await saveChannel(home)
  await addToPath(home)
}

export const skipStart = () => Boolean(process.env.SAND_NO_START)

export const startHost = async (daemon: Daemon) => {
  await allowThroughFirewall(process.execPath)
  const found = await daemon.info()
  if (found) await daemon.stop()
  const info = await daemon.start()
  done(`Server ${found ? 'restarted' : 'started'} on port ${new URL(info.url).port}`)
  return info
}

export const openSand = async (installer: Installer) => {
  notice('Opening sand in your browser…')
  await installer.open()
}

export const printFailure = (text: string) => console.error(process.stderr.isTTY ? `\x1b[31m${text}\x1b[0m` : text)
