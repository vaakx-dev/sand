import type { MergeMethod } from '@sand/github/contract'
import { pullName, pullRef } from '@sand/github/look'
import type { AgentPrompt, PullLink } from '@sand/pull-links/contract'
import type { PullPlace } from '../contract'
import { type PullsContext, toastId } from '../inject'
import { githubAction } from './github-action'

export const pullActions = (ctx: PullsContext) => {
  const { github, pullLinks, toasts } = ctx

  const ask = (link: PullLink, place: PullPlace, prompt: AgentPrompt) => pullLinks.ask(pullRef(link), prompt, place)

  const ready = async (link: PullLink, place: PullPlace) => {
    const name = pullName(link)
    const done = await toasts.attempt(toastId, `Couldn't mark ${name} ready`, () => github.ready({ ...pullRef(link), ready: true }, place.device))
    if (done) toasts.show({ id: toastId, tone: 'success', title: `${name} is ready for review` })
  }

  const merge = async (link: PullLink, place: PullPlace, method: MergeMethod, auto = false) => {
    const name = pullName(link)
    const done = await toasts.attempt(toastId, `Couldn't merge ${name}`, () => github.merge({ ...pullRef(link), method, auto }, place.device))
    if (!done) return
    const title = done.state === 'merged' ? `Merged ${name}` : `${name} merges when it's ready`
    toasts.show({ id: toastId, tone: 'success', title, actions: [githubAction(ctx.kit, done.url)] })
  }

  const watch = (link: PullLink, place: PullPlace, on: boolean) =>
    toasts.attempt(toastId, `Couldn't change watching for ${pullName(link)}`, () => pullLinks.watch({ session: place.session, pull: pullRef(link), on }, place.device))

  const unlink = (link: PullLink, place: PullPlace) =>
    toasts.attempt(toastId, `Couldn't unlink ${pullName(link)}`, () => pullLinks.unlink({ session: place.session, pull: pullRef(link) }, place.device))

  const refresh = (link: PullLink, place: PullPlace) =>
    toasts.attempt(toastId, `Couldn't refresh ${pullName(link)}`, () => github.summary({ ...pullRef(link), fresh: true }, place.device))

  return { ask, ready, merge, watch, unlink, refresh }
}

export type PullActions = ReturnType<typeof pullActions>
