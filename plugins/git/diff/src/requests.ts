import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { type GitDiffs, gitDiff, gitPatch } from './contract'

export const serveDiff = (server: Server, diffs: GitDiffs) =>
  joinDisposers(
    server.handle(gitDiff, ({ cwd, scope }) => diffs.list(cwd, scope)),
    server.handle(gitPatch, request => diffs.patch(request)),
  )
