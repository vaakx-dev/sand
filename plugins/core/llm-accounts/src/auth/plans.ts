import type { AnyPlan, AppPlan, AppStatus, Payload, Plan, PlanTokens } from '../contract'
import { errorMessage } from '@sand/kit'
import type { AppStatuses } from './app-status'
import { isKeyKind, signInError } from './kinds'

export type PlanRegistry = ReturnType<typeof createPlans>

const isApp = (plan: AnyPlan | undefined): plan is AppPlan => !!plan && 'open' in plan

const signedOut: AppStatus = { installed: false, signedIn: false }

const statusOf = async (plan: AppPlan): Promise<AppStatus> => {
  try {
    return await plan.status()
  } catch (error) {
    return { installed: true, signedIn: false, problem: errorMessage(error) }
  }
}

interface PlansOptions {
  saved: AppStatuses
  save(statuses: AppStatuses): Promise<void>
  changed(): void
  dropped(plan: AppPlan): void
}

export const createPlans = ({ saved, save, changed, dropped }: PlansOptions) => {
  const plans = new Map<string, AnyPlan>()
  const statuses = new Map(Object.entries(saved))

  const check = async (plan: AppPlan) => {
    const found = await statusOf(plan)
    if (plans.get(plan.id) !== plan || JSON.stringify(found) === JSON.stringify(statuses.get(plan.id))) return
    statuses.set(plan.id, found)
    void save(Object.fromEntries(statuses)).catch(() => {})
    changed()
  }

  const app = (id: string) => {
    const plan = plans.get(id)
    return isApp(plan) ? plan : undefined
  }

  const api = (id: string): Plan | undefined => {
    const plan = plans.get(id)
    return isApp(plan) ? undefined : plan
  }

  return {
    register(plan: AnyPlan) {
      if (isKeyKind(plan.id) || plan.id === 'server') throw new Error(`"${plan.id}" is taken by a built-in account`)
      const before = plans.get(plan.id)
      if (isApp(before)) dropped(before)
      plans.set(plan.id, plan)
      changed()
      if (isApp(plan)) void check(plan)
      return () => {
        if (isApp(plan)) dropped(plan)
        if (plans.get(plan.id) !== plan) return
        plans.delete(plan.id)
        changed()
      }
    },
    get: (id: string) => plans.get(id),
    list: () => [...plans.values()].sort((a, b) => a.label.localeCompare(b.label)),
    api,
    app,
    status: (id: string) => statuses.get(id) ?? signedOut,
    refresh: async (id?: string) => {
      const apps = [...plans.values()].filter(isApp).filter(plan => !id || plan.id === id)
      await Promise.all(apps.map(check))
    },
    call(id: string, tokens: PlanTokens, payload: Payload) {
      const plan = api(id)
      if (!plan) throw signInError(id)
      return plan.call(tokens, payload)
    },
  }
}
