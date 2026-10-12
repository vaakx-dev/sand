import type { Payload, Plan, PlanTokens } from '../contract'
import { isKeyKind, signInError } from './kinds'

export type PlanRegistry = ReturnType<typeof createPlans>

export const createPlans = (changed: () => void) => {
  const plans = new Map<string, Plan>()
  return {
    register(plan: Plan) {
      if (isKeyKind(plan.id) || plan.id === 'server') throw new Error(`"${plan.id}" is taken by a built-in account`)
      plans.set(plan.id, plan)
      changed()
      return () => {
        if (plans.get(plan.id) !== plan) return
        plans.delete(plan.id)
        changed()
      }
    },
    get: (id: string) => plans.get(id),
    list: () => [...plans.values()].sort((a, b) => a.label.localeCompare(b.label)),
    call(id: string, tokens: PlanTokens, payload: Payload) {
      const plan = plans.get(id)
      if (!plan) throw signInError(id)
      return plan.call(tokens, payload)
    },
  }
}
