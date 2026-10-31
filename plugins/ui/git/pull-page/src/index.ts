import { layout, layoutChange } from '@sand/layout/contract'
import { nav } from '@sand/nav/contract'
import { threadChange, threadsChange } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/web-client/reactive'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { queryState } from './address/state'
import { agentActions } from './agent/actions'
import { pullPage } from './contract'
import { homeAuth } from './home/auth'
import { needsCount } from './home/count'
import { inject } from './inject'
import { linkBook } from './links/book'
import { buildPage, type SharedParts } from './page/build'
import { pageHost } from './page/host'
import { repoChoices } from './projects/repos'
import { parseKey, pullKey } from './pull/ref'
import { tabBook } from './tabs/book'

export default definePlugin({
  name: 'git-pull-page',
  description: 'The Pull requests page: what needs you first, every project’s pull requests, and a detail you can merge, reply and resolve from',
  inject,
  apply(ctx) {
    const tabs = tabBook()
    const { host, signedIn, count } = owned(ctx, () => {
      const auth = homeAuth(ctx)
      const query = queryState()
      const links = linkBook(ctx)
      const threads = pulse(ctx)
      ctx.on(threadsChange, threads.schedule)
      ctx.on(threadChange, threads.schedule)
      const shared: SharedParts = {
        ctx,
        kit: ctx.kit,
        query,
        links,
        agent: agentActions(ctx, links),
        tabs,
        repos: repoChoices(ctx),
        count: needsCount(ctx, auth),
        github: auth,
        narrow: pulse(ctx, [layoutChange], [layout]).read(() => ctx.get(layout)?.state().narrow ?? false),
        selected: query.pull.map(parseKey),
        thread: session => {
          threads.version.get()
          return ctx.threads.get(session)
        },
        select: pull => query.pull.set(pull && pullKey(pull)),
        close: () => pages.close(),
        showSide: () => ctx.get(layout)?.toggle('side', true),
      }
      const pages = pageHost(ctx, query, () => buildPage(shared))
      return { host: pages, signedIn: auth.signedIn, count: shared.count }
    })

    const pullsAction = () => ({
      id: 'pull-requests',
      label: 'Pull requests',
      icon: 'pull-request',
      place: 'footer' as const,
      order: 105,
      count: () => count.get(),
      run: host.toggle,
    })

    ctx.provide(pullPage, { open: pull => host.show(pull), close: host.close, tab: tabs.add })
    ctx.watch(nav, found => (found ? effect(() => (signedIn.get() ? untrack(() => found.action(pullsAction())) : undefined)) : undefined))
  },
})
