import type { Ask } from '@sand/ask/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { commitChanges } from './commit/commit'
import { gitCommit, gitInit, gitMessage, gitPull, gitPush, gitSwitch } from './contract'
import { initRepo } from './init/init'
import { suggestMessage } from './message/suggest'
import { pullBranch } from './pull/pull'
import { pushBranch } from './push/push'
import type { Performer } from './run/perform'
import { switchBranch } from './switch/switch'

export interface ActionDeps {
  perform: Performer
  ask(): Ask | undefined
}

export const serveActions = (server: Server, { perform, ask }: ActionDeps) =>
  joinDisposers(
    server.handle(gitCommit, ({ cwd, run, ...request }) => perform.mutate({ cwd, run, action: 'commit' }, job => commitChanges(job, ask(), request))),
    server.handle(gitMessage, ({ cwd, run, ...request }) => perform.read({ cwd, run, action: 'message' }, job => suggestMessage(job, ask(), request))),
    server.handle(gitPush, ({ cwd, run }) => perform.mutate({ cwd, run, action: 'push' }, pushBranch)),
    server.handle(gitPull, ({ cwd, run }) => perform.mutate({ cwd, run, action: 'pull' }, pullBranch)),
    server.handle(gitSwitch, ({ cwd, run, ...request }) => perform.mutate({ cwd, run, action: 'switch' }, job => switchBranch(job, request))),
    server.handle(gitInit, ({ cwd, run }) => perform.folder({ cwd, run, action: 'init' }, initRepo)),
  )
