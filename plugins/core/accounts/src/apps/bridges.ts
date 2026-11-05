import type { AppPlan, LLMRequest } from '../contract'
import { createBridge, type Bridge } from './bridge'

export type Bridges = ReturnType<typeof createBridges>

export const createBridges = (home: string) => {
  const bridges = new Map<AppPlan, Bridge>()

  const bridgeFor = (plan: AppPlan) => {
    const found = bridges.get(plan)
    if (found) return found
    const made = createBridge(plan, home)
    bridges.set(plan, made)
    return made
  }

  return {
    stream: (plan: AppPlan, request: LLMRequest & { model: string }, signal?: AbortSignal, caller?: string) => bridgeFor(plan).stream(request, signal, caller),
    release: (thread: string) => bridges.forEach(bridge => bridge.release(thread)),
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
