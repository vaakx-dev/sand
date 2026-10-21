import type { Limits, Plan, PlanLimits } from './contract'

interface LimitOptions {
  saved: Record<string, Limits>
  changed(all: Record<string, Limits>, found: Limits): void
  report(error: unknown): void
}

export type LimitStore = ReturnType<typeof createLimits>

export const createLimits = ({ saved, changed, report }: LimitOptions) => {
  let all = saved

  const save = (source: string, found: PlanLimits) => {
    const limits: Limits = { source, ...found, updated: Date.now() }
    all = { ...all, [source]: limits }
    changed(all, limits)
  }

  const read = async (plan: Plan, response: Response) => {
    const found = await plan.limits?.(response)
    if (found) save(plan.id, found)
  }

  const inspect = (plan: Plan | undefined) => {
    if (!plan?.limits) return undefined
    return (response: Response) => void read(plan, response).catch(report)
  }

  return { all: () => all, save, inspect }
}
