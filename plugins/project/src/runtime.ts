import { cli } from '@sand/config/contract'
import { peers } from '@sand/devices-contract'
import { loadPcIdentity } from '@sand/devices-identity/pc'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { projectFiles } from './contract'
import { serveFiles } from './files/requests'
import { serveFolders } from './folders/requests'
import { serveIcons } from './icons/routes'
import { localCopies } from './local/copies'

export default definePlugin({
  name: 'project',
  description: 'Finds which project a folder belongs to, and lets the page list, read and see changes to files, browse folders and show project icons',
  inject: { cli },
  async apply(ctx) {
    const { home } = ctx.cli
    const local = localCopies(home, (await loadPcIdentity(home)).id)
    ctx.provide(projectFiles, { copies: local.copies, ofFolder: local.ofFolder })
    ctx.watch(server, found => found && joinDisposers(serveFiles(found), serveFolders(found), serveIcons(found, home, local, () => ctx.get(peers))))
  },
})
