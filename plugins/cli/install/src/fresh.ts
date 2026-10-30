import { dim, done } from '@sand/host-dist/setup'
import { waitForHealth } from './health'
import { checkInstalled, installedRoot, openSand, placeApp, skipStart, startHost, type Installer } from './steps'

export const installFresh = async (installer: Installer) => {
  const { home, daemon } = installer
  const root = installedRoot()
  await checkInstalled(root, home)
  await placeApp(root, home)
  if (skipStart()) {
    done('Sand installed')
    return dim("Run 'sand' to start it")
  }
  await startHost(daemon)
  await waitForHealth(daemon, home)
  await openSand(installer)
}
