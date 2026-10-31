import { type PullRef, pullKey } from '@sand/github/contract'
import { panels } from '@sand/panel/contract'
import { arrangePulls } from '@sand/pull-links/contract'
import { threadSelect } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { PullPlace, ThreadPullsClient } from './contract'
import { createOpener } from './create/open'
import type { PullsContext } from './inject'
import { currentPlace } from './links/current'
import { panelId } from './panel/id'
import { detailStates } from './panel/state'
import type { PullParts } from './parts'
import { pullActions } from './pull/actions'

export const buildPulls = (ctx: PullsContext) => {
  const { github, pullLinks } = ctx
  const actions = pullActions(ctx)
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

  const creator = createOpener(ctx, open)
  ctx.on(threadSelect, () => {
    focus.set(undefined)
    creator.close()
  })

  const parts: PullParts = owned(ctx, () => {
    const links = derive(() => {
      const at = place.get()
      return at ? pullLinks.of(at.session) : []
    })
    const states = detailStates()
    effect(() => states.keep(place.get()?.session, links.get()))
    const arrangement = links.map(arrangePulls)
    return { ctx, kit: ctx.kit, actions, states, place, links, arrangement, primary: arrangement.map(found => found.primary), focus, create: creator.open, open }
  })

  const follow: ThreadPullsClient['follow'] = (at, onChange) =>
    effect(() => {
      if (!pullLinks.loaded(at.device)) return
      const links = pullLinks.of(at.session)
      untrack(() => onChange(links))
    })

  const client: ThreadPullsClient = {
    follow,
    links: session => pullLinks.of(session),
    primary: session => arrangePulls(pullLinks.of(session)).primary,
    canCreate: at => github.authOf(at.device)?.state === 'signed-in' && Boolean(github.repoOf(at)) && pullLinks.loaded(at.device),
    create: creator.open,
    open,
  }

  return { parts, client }
}
