import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { expandHome } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { fsBrowse, fsMkdir } from '../contract'
import { browse } from './browse'

export const serveFolders = (server: Server) =>
  joinDisposers(
    server.handle(fsBrowse, ({ path }) => browse(expandHome(path))),
    server.handle(fsMkdir, async ({ path }) => {
      await mkdir(expandHome(path), { recursive: true })
    }),
  )
