import { installJoinEnv } from '@sand/devices-contract'
import { installFresh } from './fresh'
import { installPaired } from './paired'
import { joinGrantOf } from './remote'
import type { Installer } from './steps'

const usage = 'usage: sand install; to add this PC to your PCs, run the install command from Add a PC on one of them'

const takeJoinLink = () => {
  const link = process.env[installJoinEnv]
  delete process.env[installJoinEnv]
  return link
}

export const installCommand = async (installer: Installer, args: string[]) => {
  if (args.length) throw new Error(usage)
  const link = takeJoinLink()
  if (!link) return installFresh(installer)
  return installPaired(joinGrantOf(link), installer)
}
