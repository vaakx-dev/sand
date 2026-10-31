import type { GitRunner } from '@sand/git/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { existsSync } from 'node:fs'
import { filesGrep, filesList, filesRead } from '../contract'
import { grepFiles } from './grep'
import { listFiles } from './list'
import { readProjectFile } from './read'

const usable = (cwd?: string): cwd is string => Boolean(cwd && existsSync(cwd))

export const serveFiles = (server: Server, git: () => GitRunner | undefined) => {
  return joinDisposers(
    server.handle(filesList, async ({ cwd }) => (usable(cwd) ? listFiles(git(), cwd) : [])),
    server.handle(filesGrep, async ({ cwd, query }) => (usable(cwd) ? grepFiles(git(), cwd, query) : [])),
    server.handle(filesRead, ({ cwd, path }) => readProjectFile(cwd, path)),
  )
}
