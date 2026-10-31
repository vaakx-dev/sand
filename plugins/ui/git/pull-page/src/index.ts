import { pullLabel } from '@sand/github/contract'
import { layout, layoutChange } from '@sand/layout/contract'
import { nav } from '@sand/nav/contract'
import { threadChange, threadsChange } from '@sand/web-client/contract'
import { owned, pulse } from '@sand/web-client/reactive'
import { derive, effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { parsePull } from './address/pull'
import { queryState } from './address/state'
import { agentActions } from './agent/actions'
import { pullPage, type PullMenu, type PullTab } from './contract'
import { extensionBook } from './extend/book'
import { needsCount } from './home/count'
import { hereOf, inject } from './inject'
import { buildPage, type SharedParts } from './page/build'
import { pageHost } from './page/host'
import { repoChoices } from './projects/repos'

export default definePlugin({
  name: 'git-pull-page',
  description: 'The Pull requests page: what needs you first, every project’s pull requests, and a detail you can merge, reply and resolve from',
  inject,
  apply(ctx) {
    const tabs = extensionBook<PullTab>()
    const menus = extensionBook<PullMenu>()
    const { host, signedIn, count } = owned(ctx, () => {
      const auth = derive(() => ctx.github.authOf(hereOf(ctx)))
      const account = auth.map(found => (found?.state === 'signed-in' ? found.login : ''))
      const query = queryState()
      const threads = pulse(ctx)
      ctx.on(threadsChange, threads.schedule)
      ctx.on(threadChange, threads.schedule)
      const shared: SharedParts = {
        ctx,
        kit: ctx.kit,
        query,
        agent: agentActions(ctx),
        tabs,
        menus,
        repos: repoChoices(ctx),
        count: needsCount(ctx, account),
        auth,
        account,
        narrow: pulse(ctx, [layoutChange], [layout]).read(() => ctx.get(layout)?.state().narrow ?? false),
        selected: query.pull.map(parsePull),
        thread: session => {
          threads.version.get()
          return ctx.threads.get(session)
        },
        select: pull => query.pull.set(pull && pullLabel(pull)),
        close: () => pages.close(),
        showSide: () => ctx.get(layout)?.toggle('side', true),
      }
      const pages = pageHost(ctx, query, () => buildPage(shared))
      return { host: pages, signedIn: account.map(Boolean), count: shared.count }
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

    ctx.provide(pullPage, {
      open: pull => host.show(pull),
      close: host.close,
      tab: tabs.add,
      menu: menus.add,
    })
    ctx.watch(nav, found => (found ? effect(() => (signedIn.get() ? untrack(() => found.action(pullsAction())) : undefined)) : undefined))
  },
})
