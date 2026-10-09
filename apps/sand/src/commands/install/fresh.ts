import { waitForHealth } from './health'
import { dim, done } from './print'
import { checkInstalled, installedRoot, openSand, placeApp, skipStart, startHost } from './steps'

export const installFresh = async (home: string) => {
  const root = installedRoot()
  await checkInstalled(root, home)
  await placeApp(root, home)
  if (skipStart()) {
    done('Sand installed')
    return dim("Run 'sand' to start it")
  }
  await waitForHealth(await startHost(home), home)
  await openSand(home)
}
