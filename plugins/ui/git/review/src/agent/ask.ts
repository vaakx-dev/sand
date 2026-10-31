import type { DiffRange } from '@sand/git-diff-view/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { turns } from '@sand/web-client/contract'
import type { CodeTab } from '../model/state'
import { attempt, notify, notifyError } from '../notify'
import { pullName, refLabel } from '../pull/ref'
import { linkedThread } from './linked'
import { linesPrompt, type LinesPrompt } from './prompt'

const send = async ({ ctx }: CodeTab, session: string, prompt: LinesPrompt) => {
  const sender = ctx.get(turns)
  if (!sender) {
    notifyError(ctx, "Couldn't reach the agent", 'Sending prompts is not available on this page.')
    return false
  }
  const sent = await attempt(ctx, "Couldn't send the question", () => sender.send(session, prompt.text, prompt.label).then(() => true))
  if (sent) notify(ctx, { tone: 'success', title: 'Sent to the agent', actions: [{ label: 'Show thread', run: () => ctx.threads.select(session) }] })
  return Boolean(sent)
}

const openAndSend = async (tab: CodeTab, prompt: LinesPrompt, sent: () => void) => {
  const { ctx, ref } = tab
  const links = ctx.get(pullLinksClient)
  const at = ctx.pullPage.localCopy(ref.repo)
  if (!links || !at) return notifyError(ctx, `Couldn't open ${pullName(ref)}`, `No project on an online PC has ${ref.repo} as its remote.`)
  const shown = notify(ctx, { tone: 'neutral', sticky: true, title: `Opening ${pullName(ref)} in a worktree…` })
  const opened = await attempt(ctx, `Couldn't open ${pullName(ref)}`, () => links.open({ cwd: at.cwd, ref: refLabel(ref), mode: 'worktree' }, at.device))
  shown?.dismiss()
  if (opened && (await send(tab, opened.session, prompt))) sent()
}

export const askAgent = async (tab: CodeTab, range: DiffRange, question: string, sent: () => void) => {
  const { ctx, ref } = tab
  const prompt = linesPrompt(ref, range, question)
  const links = ctx.get(pullLinksClient)
  const thread = links && (await linkedThread(ctx, links, ref))
  if (thread) {
    if (await send(tab, thread.session, prompt)) sent()
    return
  }
  notify(ctx, {
    tone: 'neutral',
    sticky: true,
    title: `No thread works on ${pullName(ref)} yet`,
    detail: 'Open it in a thread and the agent gets your question there.',
    actions: [{ label: 'Open in a thread', primary: true, run: () => openAndSend(tab, prompt, sent) }],
  })
}
