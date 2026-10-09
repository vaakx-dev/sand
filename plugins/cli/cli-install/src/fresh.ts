import { dim, done } from '@sand/kit/host'
import { waitForHealth } from './health'
import type { Installer } from './installer'
import { checkInstalled, installedRoot, openSand, placeApp, skipStart, startHost } from './steps'

export const installFresh = async (installer: Installer) => {
  const { home, daemon } = installer
  const root = installedRoot()
  await checkInstalled(root, home)
  await placeApp(root, home)
  if (skipStart()) {
    done('Sand installed')
    return dim("Run 'sand' to start it")
  }
  await waitForHealth(daemon, await startHost(daemon), home)
  await openSand(installer)
}
