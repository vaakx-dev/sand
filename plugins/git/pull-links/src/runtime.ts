import { sessionRemove, sessions, sessionUpdate } from '@sand/chats/contract'
import { cli } from '@sand/config/contract'
import { gitRepo } from '@sand/git/contract'
import { gitRunner } from '@sand/git-runner/contract'
import { github, pullChanged, pullCreated, type PullSummary } from '@sand/github/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { type Server, server, sessionCarry, sessionOpened, userWrote } from '@sand/server/contract'
import { skills } from '@sand/skills/contract'
import { subModel } from '@sand/sub-model/contract'
import { tools } from '@sand/tools/contract'
import { toolResult, turnEnd, turns } from '@sand/turns-contract/contract'
import { joinDisposers, keyedSerial } from '@sand/util'
import { worktreePulls, worktrees } from '@sand/worktrees/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { createLinkBook } from './book/book'
import { linksEntry } from './book/record'
import { pullLinksService, threadPullsChange } from './contract'
import { linkCreatedInShell } from './created/link'
import { createDiscovery } from './discover/discovery'
import { createBranchFollow } from './discover/follow'
import { createThreadLinks } from './links/links'
import { primaryPull } from './links/primary'
import { type OpenDeps, openPull } from './open/open'
import { createOnceReport } from './report/once'
import { servePullLinks } from './requests'
import { isRunning } from './settle/running'
import { type AutoSettleDeps, startAutoSettle } from './settle/settle'
import { loadSettleSetting } from './settle/setting'
import { followStacks } from './stack/follow'
import { tellStarters } from './starter/tell'
import { createSweep } from './sweep/sweep'
import { createViewed } from './sweep/viewed'
import { pullTools } from './tools/tools'
import { watchJob } from './watch/screen'
import { createWake } from './watch/wake'

const skillDir = join(import.meta.dir, '..', 'skills', 'babysit-pr')

export default definePlugin({
  name: 'pull-links',
  description: "Links pull requests to threads, finds the thread branch's pull request, keeps linked ones fresh, wakes the agent when a watched one changes and opens a pull request as a thread",
  inject: { github, sessions, gitRepo, gitRunner, cli },
  async apply(ctx) {
    let live: Server | undefined
    const report = (error: unknown) => ctx.report(error)
    const failures = createOnceReport(report)
    const book = createLinkBook(ctx.sessions)

    const announce = (session: string) => {
      links
        .view(session)
        .then(pulls => {
          live?.broadcast(threadPullsChange, pulls)
          stacks(pulls)
        })
        .catch(report)
    }

    const links = createThreadLinks({ github: ctx.github, sessions: ctx.sessions, book, announce, watched: pull => sweep.soon(pull) })
    const stacks = followStacks({ sessions: ctx.sessions, book, links })
    const created = linkCreatedInShell(links, report)
    const discovery = createDiscovery({ github: ctx.github, repos: ctx.gitRepo, book, links, failures })
    const branches = createBranchFollow({ repos: ctx.gitRepo, sessions: ctx.sessions, discovery })
    const viewed = createViewed({ touched: branches.follow, ended: branches.unfollow })
    const watch = createWake({ turns: () => ctx.get(turns), sub: () => ctx.get(subModel), github: ctx.github, report, failures, hold: () => ctx.busy() })
    const sweep = createSweep({
      github: ctx.github,
      sessions: ctx.sessions,
      book,
      links,
      viewed,
      wake: watch.wake,
      started: thread => Boolean(ctx.get(orchestrator)?.starterOf(thread)),
      failures,
      hold: () => ctx.busy(),
    })
    const starters = { sessions: ctx.sessions, book, links, orchestrator: () => ctx.get(orchestrator), report }
    const setting = await loadSettleSetting(ctx.cli.home)
    const settleDeps: AutoSettleDeps = {
      github: ctx.github,
      sessions: ctx.sessions,
      book,
      links,
      setting,
      failures,
      running: thread => isRunning(ctx.sessions, ctx.get(turns), thread),
      hold: () => ctx.busy(),
    }
    const open: OpenDeps = {
      github: ctx.github,
      git: ctx.gitRunner,
      repos: ctx.gitRepo,
      sessions: ctx.sessions,
      links,
      worktrees: () => ctx.get(worktrees),
      queue: keyedSerial(),
    }

    const linkCreated = async (summary: PullSummary, session?: string) => {
      if (session) await links.link(session, summary, 'created')
    }

    ctx.effect(() => () => {
      watch.stop()
      discovery.close()
      viewed.clear()
      branches.close()
      failures.clear()
    })
    ctx.provide(pullLinksService, { links: links.view, link: links.link, open: request => openPull(open, request) })
    ctx.provide(worktreePulls, { primary: ids => primaryPull(ctx.sessions, links, ids) })

    ctx.on(sessionCarry, types => [...types, linksEntry])
    ctx.on(turnEnd, session => {
      if (session.kind === 'thread') discovery.afterTurn(session)
    })
    ctx.on(sessionOpened, (opened, session) => {
      if (session.kind !== 'thread') return opened
      viewed.touch(session.id)
      discovery.revisit(session)
      return opened
    })
    ctx.on(sessionUpdate, session => {
      if (session.settled === null) return
      links.stopWatching(session)
      links.engage(session, session.settled)
      discovery.forget(session.id)
    })
    ctx.on(userWrote, session => {
      const thread = links.thread(session.id)
      if (thread.kind === 'thread') links.wrote(thread, Date.now())
    })
    ctx.on(sessionRemove, id => {
      viewed.end(id)
      book.forget(id)
      links.forget(id)
      discovery.forget(id)
    })
    ctx.on(pullChanged, summary => {
      links.recordEnd(summary, summary.ended)
      for (const id of links.linking(summary)) announce(id)
      tellStarters(starters, summary)
    })
    ctx.on(pullCreated, (summary, session) => void linkCreated(summary, session).catch(report))
    ctx.on(toolResult, (result, call, session) => {
      try {
        created(result, call, session)
      } catch (error) {
        report(error)
      }
      return undefined
    })

    ctx.watch(tools, found => found && pullTools(found, { github: ctx.github, links, discovery }))
    ctx.watch(skills, found => found?.register(skillDir))
    ctx.watch(subModel, found => found?.job(watchJob))
    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(servePullLinks(found, { links, viewed, open, setting }), sweep.start(), startAutoSettle(settleDeps), () => {
        live = undefined
      })
    })
  },
})
