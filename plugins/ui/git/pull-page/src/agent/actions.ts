import type { PullRef } from '@sand/github/contract'
import { pullName, pullRef } from '@sand/github/look'
import { type AgentPrompt, type LinkedThread, pullLinksClient } from '@sand/pull-links/contract'
import { pulse } from '@sand/web-client/reactive'
import { type PageContext, toastId } from '../inject'

const turnedOff = 'Thread pull requests are turned off.'

export const agentActions = (ctx: PageContext) => {
  const client = pulse(ctx, [], [pullLinksClient]).read(() => ctx.get(pullLinksClient))

  const linked = (pull: PullRef): LinkedThread[] => client.get()?.threadsOf(pull) ?? []

  const canOpen = (pull: PullRef) => Boolean(client.get() && ctx.github.localCopy(pull.repo))

  const open = async (pull: PullRef) => {
    const links = client.get()
    if (!links) return ctx.toasts.error(toastId, `Couldn't open ${pullName(pull)}`, turnedOff)
    await links.openThread(pullRef(pull))
  }

  const watch = async (pull: PullRef, thread: LinkedThread, on: boolean) => {
    const title = `Couldn't change watching for ${pullName(pull)}`
    const links = client.get()
    if (!links) return ctx.toasts.error(toastId, title, turnedOff)
    await ctx.toasts.attempt(toastId, title, () => links.watch({ session: thread.session, pull: pullRef(pull), on }, thread.device))
  }

  const ask = async (pull: PullRef, prompt: AgentPrompt) => {
    const links = client.get()
    if (!links) return ctx.toasts.error(toastId, "Couldn't reach the agent", turnedOff)
    await links.ask(pullRef(pull), prompt)
  }

  return { linked, canOpen, open, watch, ask }
}

export type AgentActions = ReturnType<typeof agentActions>
