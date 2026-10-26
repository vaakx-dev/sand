import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { existsSync } from 'node:fs'
import { filesChanges, filesGrep, filesList, filesRead } from '../contract'
import { fileChanges } from './changes'
import { grepFiles } from './grep'
import { listFiles } from './list'
import { readProjectFile } from './read'

const usable = (cwd?: string): cwd is string => Boolean(cwd && existsSync(cwd))

export const serveFiles = (server: Server) => {
  return joinDisposers(
    server.handle(filesList, async ({ cwd }) => (usable(cwd) ? listFiles(cwd) : [])),
    server.handle(filesGrep, async ({ cwd, query }) => (usable(cwd) ? grepFiles(cwd, query) : [])),
    server.handle(filesRead, ({ cwd, path }) => readProjectFile(cwd, path)),
    server.handle(filesChanges, async ({ cwd }) => (usable(cwd) ? fileChanges(cwd) : {})),
  )
}
