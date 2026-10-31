import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import type { WorktreeSetup } from '@sand/worktrees/contract'
import { collectScope, derive, onTimeout, sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { notifyError } from '../notify'
import { isInside } from '../paths'

export type SetupPhase = 'running' | 'failed' | 'ready'

interface Watched {
  id: string
  cwd: string
  device: string
}

const readyMs = 2500

const isReady = (setup: WorktreeSetup) => setup.done && !setup.failed

const sameWatch = (a: Watched | undefined, b: Watched | undefined) => a?.id === b?.id && a?.cwd === b?.cwd && a?.device === b?.device

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

  const matches = (next: WorktreeSetup, device: string) =>
    Boolean(watched && device === watched.device && (next.session === watched.id || isInside(watched.cwd, next.path)))

  const sync = () => {
    const chat = ctx.threads.current()
    const next = chat && chat.info.kind !== 'quick' ? { id: chat.id, cwd: chat.info.cwd, device: chat.device } : undefined
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
      () => undefined,
    )
  }

  const act = async (flag: { retry: true } | { skip: true }) => {
    const at = watched
    const current = setup.get()
    if (!at || !current) return
    try {
      const next = await ctx.worktrees.setup({ path: current.path, ...flag }, at.device)
      if (next && at === watched) accept(next)
    } catch (error) {
      notifyError(ctx, 'Could not continue the worktree setup', error)
    }
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  const hear = (next: WorktreeSetup, device: string) => {
    if (!matches(next, device)) return
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
