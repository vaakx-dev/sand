import { errorMessage } from '@sand/kit'
import type { LoopImpl } from '@sand/loops/contract'
import { evict, type ScopeView } from 'drydock'
import type { TrialContext } from '../context'
import { captureLoops } from './capture'

const settleLimit = 10_000

const settled = (scope: ScopeView) => scope.status === 'active' || scope.status === 'failed' || scope.status === 'disposed'

const problem = (scope: ScopeView) => {
  if (scope.status === 'failed') return `The plugin failed to start: ${errorMessage(scope.error)}`
  if (scope.status === 'pending') return `The plugin did not start within 10 seconds; it waits for: ${scope.missing().join(', ') || 'unknown services'}`
  return `The plugin is ${scope.status} after 10 seconds`
}

export interface LoadedDraft {
  loops: LoopImpl[]
  dispose(): Promise<void>
}

export const loadDraft = async (ctx: TrialContext, dir: string): Promise<LoadedDraft> => {
  const layer = ctx.layer()
  const capture = captureLoops(ctx.loops)
  layer.provide('loops', capture.service)
  evict(dir)
  try {
    const scope = layer.load(dir, {})
    const deadline = Date.now() + settleLimit
    while (!settled(scope) && Date.now() < deadline) await Bun.sleep(25)
    if (scope.status !== 'active') throw new Error(problem(scope))
  } catch (error) {
    await layer.dispose()
    throw error
  }
  return { loops: [...capture.captured], dispose: () => layer.dispose() }
}
