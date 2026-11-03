import { isPcUnavailable, pcHello } from '@sand/devices-contract'
import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import type { SetupAnswer, SetupLines, SetupProposal } from '@sand/worktrees/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { sameWatch, type Watched, watchedThread, watches } from '../setup/watched'
import { toastId } from '../toast'

export const followProposal = (ctx: WorkspaceContext) => {
  const lines = sig<SetupLines | null>(null)
  const answering = sig(false)
  let watched: Watched | undefined
  let ticket = 0

  const sync = () => {
    const next = watchedThread(ctx)
    if (sameWatch(next, watched)) return
    watched = next
    ticket++
    lines.set(null)
    if (!next) return
    const mine = ticket
    ctx.worktrees.proposal({ path: next.cwd }, next.device).then(
      found => {
        if (mine === ticket && found) lines.set(found)
      },
      error => {
        if (!isPcUnavailable(error)) return ctx.report(error)
        if (mine === ticket) watched = undefined
      },
    )
  }

  const hear = (proposal: SetupProposal, device: string) => {
    if (watches(watched, proposal, device)) lines.set(proposal.lines)
  }

  const answer = async (answer: SetupAnswer) => {
    const at = watched
    if (!at || answering.get()) return
    answering.set(true)
    const done = await ctx.toasts.attempt(toastId, 'Could not update the worktree setup', () => ctx.worktrees.proposal({ path: at.cwd, answer }, at.device))
    answering.set(false)
    if (done === null && at === watched) lines.set(null)
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.on(pcHello, sync)
  ctx.effect(() => ctx.worktrees.onProposal(hear))
  ctx.effect(() => {
    sync()
    return () => {
      watched = undefined
    }
  })

  const visible = derive(() => Boolean(lines.get()))

  return { lines, answering, visible, answer }
}

export type ProposalModel = ReturnType<typeof followProposal>
