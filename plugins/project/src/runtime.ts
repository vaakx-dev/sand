import { cli } from '@sand/config/contract'
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
  description: 'Finds which project a folder belongs to, and lets the page list files, browse folders and show project icons',
  inject: { cli },
  apply(ctx) {
    const { home } = ctx.cli
    const local = localCopies(home)
    ctx.provide(projectFiles, { copies: local.copies, ofFolder: local.ofFolder })
    ctx.watch(server, found => found && joinDisposers(serveFiles(found), serveFolders(found), serveIcons(found, home, local)))
  },
})
