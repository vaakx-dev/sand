import { sessionRemove, sessions, sessionUpdate } from '@sand/chats/contract'
import { gitRepo, gitRunner } from '@sand/git/contract'
import { github, pullChanged, pullCreated, type PullSummary } from '@sand/github/contract'
import { loop, sessionOpened, turnEnd } from '@sand/loop/contract'
import { type Server, server, sessionCarry } from '@sand/server/contract'
import { skills } from '@sand/skills/contract'
import { steering } from '@sand/steering/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers, keyedSerial } from '@sand/util'
import { worktrees } from '@sand/worktrees/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { createLinkBook } from './book/book'
import { linksEntry } from './book/record'
import { pullLinksService, threadPullsChange } from './contract'
import { createDiscovery } from './discover/discovery'
import { createBranchFollow } from './discover/follow'
import { createThreadLinks } from './links/links'
import { type OpenDeps, openPull } from './open/open'
import { createOnceReport } from './report/once'
import { servePullLinks } from './requests'
import { createSweep } from './sweep/sweep'
import { createViewed } from './sweep/viewed'
import { pullTools } from './tools/tools'
import { wakeAgent, type Wakers } from './watch/wake'

const skillDir = join(import.meta.dir, '..', 'skills', 'babysit-pr')

export default definePlugin({
  name: 'pull-links',
  description: "Links pull requests to threads, finds the thread branch's pull request, keeps linked ones fresh, wakes the agent when a watched one changes and opens a pull request as a thread",
  inject: { github, sessions, gitRepo, gitRunner },
  apply(ctx) {
    let live: Server | undefined
    const report = (error: unknown) => ctx.report(error)
    const failures = createOnceReport(report)
    const book = createLinkBook(ctx.sessions)

    const announce = (session: string) => {
      const found = live
      if (!found) return
      links
        .view(session)
        .then(pulls => found.broadcast(threadPullsChange, pulls))
        .catch(report)
    }

    const links = createThreadLinks({ github: ctx.github, sessions: ctx.sessions, book, announce, watched: pull => sweep.soon(pull) })
    const discovery = createDiscovery({ github: ctx.github, repos: ctx.gitRepo, book, links, failures })
    const branches = createBranchFollow({ repos: ctx.gitRepo, sessions: ctx.sessions, discovery })
    const viewed = createViewed({ touched: branches.follow, ended: branches.unfollow })
    const wakers: Wakers = { loop: () => ctx.get(loop), steering: () => ctx.get(steering), report }
    const sweep = createSweep({
      github: ctx.github,
      sessions: ctx.sessions,
      book,
      links,
      viewed,
      wake: (session, text, label) => wakeAgent(wakers, session, text, label),
      failures,
      hold: () => ctx.busy(),
    })
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
      discovery.close()
      viewed.clear()
      branches.close()
      failures.clear()
    })
    ctx.provide(pullLinksService, { links: links.view, link: links.link, open: request => openPull(open, request) })

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
      if (session.settled !== null) links.stopWatching(session)
    })
    ctx.on(sessionRemove, id => {
      viewed.end(id)
      book.forget(id)
    })
    ctx.on(pullChanged, summary => {
      for (const id of links.linking(summary)) announce(id)
    })
    ctx.on(pullCreated, (summary, session) => void linkCreated(summary, session).catch(report))

    ctx.watch(tools, found => found && pullTools(found, { github: ctx.github, links, discovery }))
    ctx.watch(skills, found => found?.register(skillDir))
    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(servePullLinks(found, { links, viewed, open }), sweep.start(), () => {
        live = undefined
      })
    })
  },
})
