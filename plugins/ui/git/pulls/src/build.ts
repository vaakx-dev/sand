import { panels } from '@sand/panel/contract'
import type { PullRef } from '@sand/github/contract'
import { threadSelect } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { derive, effect, sig } from '@vaakx-dev/vrui'
import type { PullPlace, ThreadPullsClient } from './contract'
import { createOpener } from './create/open'
import { githubAccounts } from './github/accounts'
import { githubRepos } from './github/repos'
import type { PullsContext } from './inject'
import { currentPlace } from './links/current'
import { primaryOf, pullKey } from './links/rank'
import { linkStore } from './links/store'
import { panelId } from './panel/id'
import type { PullParts } from './parts'
import { pullActions } from './pull/actions'

export const buildPulls = (ctx: PullsContext) => {
  const store = linkStore(ctx)
  const accounts = githubAccounts(ctx)
  const repos = githubRepos(ctx)
  const actions = pullActions(ctx, store)
  const place = currentPlace(ctx)
  const focus = sig<string | undefined>(undefined)

  const reveal = (pull: PullRef) => {
    focus.set(pullKey(pull))
    ctx.get(panels)?.show(panelId)
  }

  const open = (pull: PullRef, at: PullPlace) => {
    if (ctx.threads.current()?.id === at.session) return reveal(pull)
    void ctx.threads.select(at.session).then(() => reveal(pull))
  }

  const creator = createOpener(ctx, store, open)
  ctx.on(threadSelect, () => {
    focus.set(undefined)
    creator.close()
  })
  ctx.effect(() =>
    effect(() => {
      const at = place.get()
      if (at) store.ensure(at.session, at.device)
    }),
  )

  const parts: PullParts = owned(ctx, () => {
    const links = derive(() => {
      const at = place.get()
      return at ? store.read(at.session) : []
    })
    return { ctx, kit: ctx.kit, store, actions, place, links, primary: links.map(primaryOf), focus, create: creator.open, open }
  })

  const client: ThreadPullsClient = {
    follow: (at, onChange) => store.follow(at.session, at.device, onChange),
    links: session => store.read(session),
    primary: session => primaryOf(store.read(session)),
    canCreate: at => accounts.signedIn(at.device) && repos.isGitHub(at) && store.isLoaded(at.session),
    create: creator.open,
    open,
  }

  return { parts, client, accounts }
}
