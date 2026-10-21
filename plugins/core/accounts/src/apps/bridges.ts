import type { AppPlan, LLMRequest } from '../contract'
import { createBridge, type Bridge } from './bridge'

export type Bridges = ReturnType<typeof createBridges>

export const createBridges = (cwd: string) => {
  const bridges = new Map<AppPlan, Bridge>()

  const bridgeFor = (plan: AppPlan) => {
    const found = bridges.get(plan)
    if (found) return found
    const made = createBridge(plan, cwd)
    bridges.set(plan, made)
    return made
  }

  return {
    stream: (plan: AppPlan, request: LLMRequest & { model: string }, signal?: AbortSignal) => bridgeFor(plan).stream(request, signal),
    forget(plan: AppPlan) {
      bridges.get(plan)?.close()
      bridges.delete(plan)
    },
    close() {
      bridges.forEach(bridge => bridge.close())
      bridges.clear()
    },
  }
}
