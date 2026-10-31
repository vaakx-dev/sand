import type { DiffRange } from '@sand/git-diff-view/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { toastId } from '../inject'
import type { CodeTab } from '../model/state'
import { linesPrompt } from './prompt'

export const askAgent = async ({ ctx, ref }: CodeTab, range: DiffRange, question: string, sent: () => void) => {
  const links = ctx.get(pullLinksClient)
  if (!links) return ctx.toasts.error(toastId, "Couldn't reach the agent", 'Thread pull requests are turned off.')
  if (await links.ask(ref, linesPrompt(ref, range, question))) sent()
}
