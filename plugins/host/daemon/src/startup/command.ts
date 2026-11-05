import { running } from '../control/info'
import { type Entry, serviceEntry } from './entry'
import { keep } from './keep'
import type { Platform } from './platform'
import { platform } from './platforms'

type Action = (os: Platform, entry: Entry) => Promise<void>

export const serviceUsage = [
  'sand service install            start sand with the OS for this home, now and after every restart',
  'sand service uninstall          stop starting sand with the OS; a running sand keeps running',
  'sand service status             show whether sand starts with the OS and whether it is running',
].join('\n')

const install: Action = async (os, entry) => {
  await os.install(entry)
  console.log(`sand now starts ${os.startsWhen} (${os.where(entry)}) and comes back if it crashes`)
  console.log(os.unattended)
}

const uninstall: Action = async (os, entry) => {
  if (!(await os.installed(entry))) return console.log('sand does not start with the OS')
  await os.uninstall(entry)
  console.log(`removed ${os.where(entry)}; sand no longer starts with the OS, and a running sand keeps running`)
}

const status: Action = async (os, entry) => {
  const installed = await os.installed(entry)
  console.log(installed ? `sand starts ${os.startsWhen} (${os.where(entry)})` : 'sand does not start with the OS; `sand service install` sets that up')
  const info = await running(entry.home)
  console.log(info ? `sand is running (pid ${info.pid}) at ${info.url}` : 'sand is not running')
}

const run: Action = (os, entry) => keep(entry.home, () => os.installed(entry))

const actions = new Map<string | undefined, Action>([
  ['install', install],
  ['uninstall', uninstall],
  ['status', status],
  ['run', run],
])

export const service = (home: string, [action]: string[]) => {
  const chosen = actions.get(action)
  if (!chosen) throw new Error(`usage:\n${serviceUsage}`)
  return chosen(platform(), serviceEntry(home))
}
