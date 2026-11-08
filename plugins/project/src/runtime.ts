import { cli } from '@sand/config/contract'
import { peers } from '@sand/devices-contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { gitRunner } from '@sand/git-runner/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { serveBring } from './bring/requests'
import { projectFiles } from './contract'
import { serveFiles } from './files/requests'
import { serveFolders } from './folders/requests'
import { serveIcons } from './icons/routes'
import { localCopies } from './local/copies'

export default definePlugin({
  name: 'project',
  description: 'Finds which project a folder belongs to, lets the page list, search and read files, browse folders and show project icons, and brings a project to another PC',
  inject: { cli },
  async apply(ctx) {
    const { home } = ctx.cli
    const here = (await loadPcIdentity(home)).id
    const local = localCopies(home, here)
    ctx.provide(projectFiles, { copies: local.copies, ofFolder: local.ofFolder, name: local.name })
    const git = () => ctx.get(gitRunner)
    ctx.watch(
      server,
      found =>
        found &&
        joinDisposers(serveFiles(found, git), serveFolders(found), serveIcons(found, home, local, () => ctx.get(peers)), serveBring(found, { here, local, services: ctx })),
    )
  },
})
