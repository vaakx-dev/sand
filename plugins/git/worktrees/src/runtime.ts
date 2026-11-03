import { ask } from '@sand/ask/contract'
import { sessions, sessionSettle } from '@sand/chats/contract'
import { textOf } from '@sand/chats/prompt'
import { gitRepo, gitRunner, pathKey } from '@sand/git/contract'
import { loop, turnPrompt, turnStart } from '@sand/loop/contract'
import { paths } from '@sand/paths/contract'
import { projectFiles } from '@sand/project/contract'
import { type Server, server } from '@sand/server/contract'
import { shellReady, shellRunner } from '@sand/shell/contract'
import { errorMessage, joinDisposers, keyedSerial } from '@sand/util'
import { expandHome } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { config } from './config'
import { worktrees, worktreesChange, worktreesProgress } from './contract'
import { threadIn } from './create/thread'
import type { WorktreeDeps } from './deps'
import { nameOnFirstTurn } from './naming/name'
import { createParking } from './park/park'
import { createStore } from './records/store'
import { serveWorktrees } from './requests'
import { createSetups } from './setup/setups'

export default definePlugin({
  name: 'worktrees',
  description: "Gives a thread its own git worktree: creates, sets up, names, moves into, removes and restores worktrees on the PC that holds the repo",
  inject: { gitRunner, gitRepo, sessions, paths },
  config,
  apply(ctx, config) {
    let live: Server | undefined
    const report = (error: unknown) => ctx.report(error)
    const store = createStore(join(ctx.paths.home, 'worktrees.json'), () => ctx.busy())
    store.ready().catch(report)
    const setups = createSetups({ store, shell: () => ctx.get(shellRunner), send: setup => live?.broadcast(worktreesProgress, setup), report })
    ctx.effect(() => () => {
      setups.close()
      store.close()
    })
    const serialByRepo = keyedSerial()

    const busy = (id: string): boolean => {
      const session = ctx.sessions.open(id)
      const running = ctx.get(loop)
      return Boolean(session && running?.active(session)) || ctx.sessions.children(id).some(child => busy(child.id))
    }

    const deps: WorktreeDeps = {
      git: ctx.gitRunner,
      repos: ctx.gitRepo,
      sessions: ctx.sessions,
      store,
      setups,
      folder: config.folder ? expandHome(config.folder) : join(ctx.paths.home, 'worktrees'),
      prefix: config.prefix,
      queue: (main, task) => serialByRepo(pathKey(main), task),
      busy,
      projectOf: folder => ctx.get(projectFiles)?.ofFolder(folder) ?? null,
      ask: () => ctx.get(ask),
      async changed(main, ...folders) {
        live?.broadcast(worktreesChange, { main })
        await Promise.all([main, ...folders].map(folder => ctx.gitRepo.refresh(folder).catch(report)))
      },
      report,
    }

    ctx.provide(worktrees, { thread: input => threadIn(deps, input) })
    ctx.on(shellReady, (cwd, signal, progress) => setups.ready(cwd, signal, () => progress('Waiting for the worktree setup to finish�')).catch(report))
    const parking = createParking(deps)
    ctx.on(sessionSettle, parking.settled)
    ctx.on(turnPrompt, (_content, session) => parking.resume(session).catch(report), { priority: 100 })
    ctx.on(turnStart, (session, prompt) => {
      if (session.kind !== 'thread') return
      nameOnFirstTurn(deps, session, textOf(prompt.content)).catch(error =>
        report(new Error(`Kept the temporary branch name in ${session.cwd}: ${errorMessage(error)}`)),
      )
    })

    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(serveWorktrees(found, deps), () => {
        live = undefined
      })
    })
  },
})
