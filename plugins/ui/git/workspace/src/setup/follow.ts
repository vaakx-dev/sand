import { isPcUnavailable, pcHello } from '@sand/devices-contract'
import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import type { WorktreeSetup } from '@sand/worktrees/contract'
import { collectScope, derive, onTimeout, sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'
import { sameWatch, type Watched, watchedThread, watches } from './watched'

export type SetupPhase = 'running' | 'failed' | 'ready'

const readyMs = 2500

const isReady = (setup: WorktreeSetup) => setup.done && !setup.failed

export const phaseOf = (setup: WorktreeSetup): SetupPhase => (setup.failed ? 'failed' : setup.done ? 'ready' : 'running')

export const followSetup = (ctx: WorkspaceContext) => {
  const setup = sig<WorktreeSetup | undefined>(undefined)
  let watched: Watched | undefined
  let ticket = 0
  let heard = -1
  let hide: (() => void) | undefined

  const clearHide = () => {
    hide?.()
    hide = undefined
  }

  const accept = (next: WorktreeSetup) => {
    clearHide()
    if (!isReady(next)) return setup.set(next)
    if (!setup.get()) return
    setup.set(next)
    hide = collectScope(() => onTimeout(() => setup.set(undefined), readyMs)).value
  }

  const sync = () => {
    const next = watchedThread(ctx)
    if (sameWatch(next, watched)) return
    watched = next
    ticket++
    clearHide()
    setup.set(undefined)
    if (!next) return
    const mine = ticket
    ctx.worktrees.setup({ path: next.cwd }, next.device).then(
      found => {
        if (mine === ticket && heard !== mine && found && !isReady(found)) setup.set(found)
      },
      error => {
        if (!isPcUnavailable(error)) return ctx.report(error)
        if (mine === ticket) watched = undefined
      },
    )
  }

  const act = async (flag: { retry: true } | { skip: true }) => {
    const at = watched
    const current = setup.get()
    if (!at || !current) return
    const next = await ctx.toasts.attempt(toastId, 'Could not continue the worktree setup', () => ctx.worktrees.setup({ path: current.path, ...flag }, at.device))
    if (next && at === watched) accept(next)
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  ctx.on(pcHello, sync)
  const hear = (next: WorktreeSetup, device: string) => {
    if (!watches(watched, next, device)) return
    heard = ticket
    accept(next)
  }

  ctx.effect(() => ctx.worktrees.onProgress(hear))
  ctx.effect(() => {
    sync()
    return () => {
      clearHide()
      watched = undefined
    }
  })

  const visible = derive(() => Boolean(setup.get()))

  return { setup, visible, retry: () => act({ retry: true }), skip: () => act({ skip: true }) }
}

export type SetupModel = ReturnType<typeof followSetup>
