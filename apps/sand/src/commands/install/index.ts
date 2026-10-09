import { installFresh } from './fresh'
import { installPaired } from './paired'

const usage = 'usage: sand install, or SAND_INSTALL_KEY=<secret> sand install <url> to pair with another PC; run the installer from https://vaakx-dev.github.io/sand'

const takeSecret = () => {
  const secret = process.env.SAND_INSTALL_KEY
  delete process.env.SAND_INSTALL_KEY
  return secret
}

export const installCommand = async (home: string, args: string[]) => {
  const secret = takeSecret()
  const base = args[0]?.replace(/\/+$/, '')
  if (!base && !secret) return installFresh(home)
  if (!base || !secret) throw new Error(usage)
  return installPaired({ base, secret }, home)
}
