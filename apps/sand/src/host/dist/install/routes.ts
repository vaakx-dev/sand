import { hostPaths } from '@sand/kit'
import type { HostBuild, HostRemotes, HttpRoute } from '@sand/protocol'
import type { InstallKeys } from '../installs'
import { psScript } from '../scripts/ps'
import { shScript } from '../scripts/sh'
import { doneRoute, failRoute, stepRoute } from './finish'
import { pairRoute } from './pair'
import { pluginsRoute } from './plugins'
import { scriptRoute } from './script'

export interface InstallRouteDeps {
  home: string
  id: string
  name: string
  installs: InstallKeys
  build: Pick<HostBuild, 'info'>
  remotes: Pick<HostRemotes, 'add'>
}

export const installRoutes = ({ home, id, name, installs, build, remotes }: InstallRouteDeps): [string, HttpRoute][] => [
  [hostPaths.installSh, scriptRoute(shScript, { installs, build, name })],
  [hostPaths.installPs, scriptRoute(psScript, { installs, build, name })],
  [hostPaths.installPlugins, pluginsRoute({ home, installs })],
  [hostPaths.installPair, pairRoute({ installs, remotes, id, name })],
  [hostPaths.installStep, stepRoute(installs)],
  [hostPaths.installDone, doneRoute(installs)],
  [hostPaths.installFail, failRoute(installs)],
]
