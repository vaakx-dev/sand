import { hostPaths } from '@sand/kit'
import type { HostRemotes, HttpRoute } from '@sand/protocol'
import type { InstallKeys } from '../installs'
import { doneRoute, failRoute, stepRoute } from './finish'
import { pairRoute } from './pair'
import { pluginsRoute } from './plugins'

export interface InstallRouteDeps {
  home: string
  id: string
  name: string
  installs: InstallKeys
  remotes: Pick<HostRemotes, 'add'>
}

export const installRoutes = ({ home, id, name, installs, remotes }: InstallRouteDeps): [string, HttpRoute][] => [
  [hostPaths.installPlugins, pluginsRoute({ home, installs })],
  [hostPaths.installPair, pairRoute({ installs, remotes, id, name })],
  [hostPaths.installStep, stepRoute(installs)],
  [hostPaths.installDone, doneRoute(installs)],
  [hostPaths.installFail, failRoute(installs)],
]
