import type { PullSummary } from '@sand/github/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { turns } from '@sand/web-client/contract'
import type { PageContext } from '../inject'
import type { LinkBook, LinkedThread } from '../links/book'
import { attempt, notify, notifyError } from '../notify'
import { pullName } from '../pull/look'
import { refOf } from '../pull/ref'
import { repoPlace } from './place'
import type { AgentPrompt } from './prompts'

export const agentActions = (ctx: PageContext, links: LinkBook) => {
  const canOpen = (pull: PullSummary) => Boolean(ctx.get(pullLinksClient) && repoPlace(ctx, pull.repo))

  const open = async (pull: PullSummary, select = true): Promise<LinkedThread | undefined> => {
    const name = pullName(pull.number)
    const client = ctx.get(pullLinksClient)
    if (!client) {
      notifyError(ctx, `Couldn't open ${name}`, 'Thread pull requests are turned off.')
      return undefined
    }
    const at = repoPlace(ctx, pull.repo)
    if (!at) {
      notifyError(ctx, `Couldn't open ${name}`, `No project on an online PC has ${pull.repo} as its remote.`)
      return undefined
    }
    const shown = notify(ctx, { tone: 'neutral', sticky: true, title: `Opening ${name} in a worktree…` })
    const opened = await attempt(ctx, `Couldn't open ${name}`, () => client.open({ cwd: at.cwd, ref: pull.url, mode: 'worktree' }, at.device))
    shown?.dismiss()
    if (!opened) return undefined
    if (select) await ctx.threads.select(opened.session)
    return { session: opened.session, device: at.device, watching: false }
  }

  const watch = async (pull: PullSummary, thread: LinkedThread, on: boolean) => {
    const title = `Couldn't change watching for ${pullName(pull.number)}`
    const client = ctx.get(pullLinksClient)
    if (!client) return notifyError(ctx, title, 'Thread pull requests are turned off.')
    const result = await attempt(ctx, title, () => client.watch({ session: thread.session, pull: refOf(pull), on }, thread.device))
    if (result) links.put(thread.device, [result], false)
  }

  const ask = async (thread: LinkedThread, prompt: AgentPrompt) => {
    const sender = ctx.get(turns)
    if (!sender) return notifyError(ctx, "Couldn't reach the agent", 'Sending prompts is not available on this page.')
    const sent = await attempt(ctx, "Couldn't send the prompt", () => sender.send(thread.session, prompt.text, prompt.label).then(() => true))
    if (sent) notify(ctx, { tone: 'success', title: 'Sent to the agent', actions: [{ label: 'Show thread', run: () => ctx.threads.select(thread.session) }] })
  }

  const askLinked = async (pull: PullSummary, linked: LinkedThread | undefined, prompt: AgentPrompt) => {
    const thread = linked ?? (await open(pull, false))
    if (thread) await ask(thread, prompt)
  }

  return { canOpen, open, watch, ask, askLinked }
}

export type AgentActions = ReturnType<typeof agentActions>
