import { type GitAction, type GitActionFailure, type GitActionResult, type GitPhase, gitProgress } from '@sand/git-actions/contract'
import type { GitPlace } from '@sand/git/contract'
import { errorMessage, uuid } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { ControlContext } from '../inject'
import { placeKey } from '../status/place'

export interface ActiveRun {
  id: string
  action: GitAction
  phase: GitPhase
  started: number
  line?: string
}

export const createRuns = (ctx: ControlContext) => {
  const active = sig<ReadonlyMap<string, ActiveRun>>(new Map())

  const put = (key: string, run?: ActiveRun) => {
    const next = new Map(active.get())
    if (run) next.set(key, run)
    else next.delete(key)
    active.set(next)
  }

  ctx.effect(() =>
    ctx.wire.on(
      gitProgress,
      ({ run: id, phase, line }) => {
        for (const [key, run] of active.get()) if (run.id === id) put(key, { ...run, phase, line })
      },
      { from: 'all' },
    ),
  )

  const at = (place: GitPlace | undefined) => (place ? active.get().get(placeKey(place)) : undefined)

  const perform = async <T>(
    place: GitPlace,
    action: GitAction,
    phase: GitPhase,
    call: (run: string) => Promise<GitActionResult<T>>,
  ): Promise<GitActionResult<T> | undefined> => {
    const key = placeKey(place)
    if (active.get().has(key)) return undefined
    const id = uuid()
    put(key, { id, action, phase, started: Date.now() })
    try {
      return await call(id)
    } catch (error) {
      const failed: GitActionFailure = { ok: false, reason: 'unknown', message: errorMessage(error) }
      return failed
    } finally {
      if (active.get().get(key)?.id === id) put(key)
    }
  }

  return { at, perform }
}

export type Runs = ReturnType<typeof createRuns>
