import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { gitDiff, gitPatch } from './contract'
import type { DiffGit } from './git'
import { listDiff } from './list/list'
import { readPatch } from './patch/patch'

export const serveDiff = (server: Server, tools: DiffGit) =>
  joinDisposers(
    server.handle(gitDiff, ({ cwd, scope }) => listDiff(tools, cwd, scope)),
    server.handle(gitPatch, request => readPatch(tools, request)),
  )
