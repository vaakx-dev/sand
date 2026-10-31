import type { MergeMethod, PullSummary } from '@sand/github/contract'
import type { PullLink } from '@sand/pull-links/contract'
import { turns } from '@sand/web-client/contract'
import type { PullPlace } from '../contract'
import type { PullsContext } from '../inject'
import type { LinkStore } from '../links/store'
import { githubAction, notify, notifyError } from '../notify'
import { pullName } from './look'
import type { AgentPrompt } from './prompts'

export const pullActions = (ctx: PullsContext, store: LinkStore) => {
  const { github, pullLinks } = ctx
  const ref = (link: PullLink) => ({ repo: link.repo, number: link.number })

  const attempt = async <T>(title: string, work: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await work()
    } catch (error) {
      notifyError(ctx, title, error)
      return undefined
    }
  }

  const changed = (summary: PullSummary | undefined, place: PullPlace) => {
    if (summary) store.patch(summary, place.device)
    return summary
  }

  const ask = async (place: PullPlace, prompt: AgentPrompt) => {
    const sender = ctx.get(turns)
    if (!sender) return notifyError(ctx, "Couldn't reach the agent", 'Sending prompts is not available on this page.')
    await attempt("Couldn't send the prompt", () => sender.send(place.session, prompt.text, prompt.label))
  }

  const ready = async (link: PullLink, place: PullPlace) => {
    const name = pullName(link)
    const done = changed(await attempt(`Couldn't mark ${name} ready`, () => github.ready({ ...ref(link), ready: true }, place.device)), place)
    if (done) notify(ctx, { tone: 'success', title: `${name} is ready for review` })
  }

  const merge = async (link: PullLink, place: PullPlace, method: MergeMethod, auto = false) => {
    const name = pullName(link)
    const done = changed(await attempt(`Couldn't merge ${name}`, () => github.merge({ ...ref(link), method, auto }, place.device)), place)
    if (!done) return
    const title = done.state === 'merged' ? `Merged ${name}` : `${name} merges when it's ready`
    notify(ctx, { tone: 'success', title, actions: [githubAction(ctx, done.url)] })
  }

  const watch = async (link: PullLink, place: PullPlace, on: boolean) => {
    const result = await attempt(`Couldn't change watching for ${pullName(link)}`, () => pullLinks.watch({ session: place.session, pull: ref(link), on }, place.device))
    if (result) store.apply(result, place.device)
  }

  const unlink = async (link: PullLink, place: PullPlace) => {
    const result = await attempt(`Couldn't unlink ${pullName(link)}`, () => pullLinks.unlink({ session: place.session, pull: ref(link) }, place.device))
    if (result) store.apply(result, place.device)
  }

  const refresh = async (link: PullLink, place: PullPlace) => {
    changed(await attempt(`Couldn't refresh ${pullName(link)}`, () => github.summary({ ...ref(link), fresh: true }, place.device)), place)
  }

  return { ask, ready, merge, watch, unlink, refresh }
}

export type PullActions = ReturnType<typeof pullActions>
