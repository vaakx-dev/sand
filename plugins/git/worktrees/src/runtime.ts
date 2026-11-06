import { sessions, sessionSettle, textOf } from '@sand/chats/contract'
import { gitRepo, pathKey } from '@sand/git/contract'
import { gitRunner } from '@sand/git-runner/contract'
import { paths } from '@sand/paths/contract'
import { projectFiles } from '@sand/project/contract'
import { type Server, server } from '@sand/server/contract'
import { shellReady, shellRunner } from '@sand/shell/contract'
import { subModel } from '@sand/sub-model/contract'
import { tools } from '@sand/tools/contract'
import { turnEnd, turnPrompt, turnStart, turns } from '@sand/turns-contract/contract'
import { errorMessage, joinDisposers, keyedSerial } from '@sand/util'
import { expandHome } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { config } from './config'
import { worktreePulls, worktrees, worktreesChange, worktreesProgress, worktreesProposed } from './contract'
import { threadIn } from './create/thread'
import type { WorktreeDeps } from './deps'
import { branchJob } from './naming/ask'
import { nameOnFirstTurn } from './naming/name'
import { createParking } from './park/park'
import { startSweep } from './park/sweep'
import { setupJob } from './proposal/ask'
import { createProposals } from './proposal/proposals'
import { createStore } from './records/store'
import { serveWorktrees } from './requests'
import { createSetups } from './setup/setups'
import { createSurvey } from './status/survey'
import { registerTools } from './tools'
import { createMoves } from './tools/move'

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
    const proposals = createProposals({
      git: ctx.gitRunner,
      store,
      setups,
      file: join(ctx.paths.home, 'worktree-proposals.json'),
      sub: () => ctx.get(subModel),
      send: proposal => live?.broadcast(worktreesProposed, proposal),
    })
    const serialByRepo = keyedSerial()

    const busy = (id: string): boolean => {
      const session = ctx.sessions.open(id)
      return Boolean(session && ctx.get(turns)?.current(session)) || ctx.sessions.children(id).some(child => busy(child.id))
    }

    const deps: WorktreeDeps = {
      git: ctx.gitRunner,
      repos: ctx.gitRepo,
      sessions: ctx.sessions,
      store,
      setups,
      proposals,
      folder: config.folder ? expandHome(config.folder) : join(ctx.paths.home, 'worktrees'),
      prefix: config.prefix,
      keepDays: { settled: config.settledDays, removed: config.removedDays },
      queue: (main, task) => serialByRepo(pathKey(main), task),
      busy,
      projectOf: folder => ctx.get(projectFiles)?.ofFolder(folder) ?? null,
      sub: () => ctx.get(subModel),
      async changed(main, ...folders) {
        live?.broadcast(worktreesChange, { main })
        await Promise.all([main, ...folders].map(folder => ctx.gitRepo.refresh(folder).catch(report)))
      },
      report,
    }

    const pulls = () => ctx.get(worktreePulls)
    const survey = createSurvey(deps, pulls)
    const moves = createMoves(deps, () => ctx.get(turns), () => ctx.busy())

    ctx.provide(worktrees, { thread: input => threadIn(deps, input) })
    ctx.watch(subModel, found => found?.job(branchJob))
    ctx.watch(subModel, found => found?.job(setupJob))
    ctx.on(turnEnd, (session, result) => moves.ended(session, result))
    ctx.watch(tools, found => (found ? registerTools(found, deps, survey, moves, () => ctx.get(turns)) : undefined))
    ctx.on(shellReady, (cwd, signal, progress) => setups.ready(cwd, signal, () => progress('Waiting for the worktree setup to finish…')).catch(report))
    const parking = createParking(deps, pulls)
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
      return joinDisposers(serveWorktrees(found, deps, survey), startSweep(deps, pulls, () => ctx.busy()), () => {
        live = undefined
      })
    })
  },
})
