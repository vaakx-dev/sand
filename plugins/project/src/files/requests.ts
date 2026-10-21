import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { existsSync } from 'node:fs'
import { filesGrep, filesList } from '../contract'
import { grepFiles } from './grep'
import { cachedList } from './list'

const usable = (cwd?: string): cwd is string => Boolean(cwd && existsSync(cwd))

export const serveFiles = (server: Server) => {
  const list = cachedList()
  return joinDisposers(
    server.handle(filesList, async ({ cwd }) => (usable(cwd) ? list(cwd) : [])),
    server.handle(filesGrep, async ({ cwd, query }) => (usable(cwd) ? grepFiles(cwd, query) : [])),
  )
}
