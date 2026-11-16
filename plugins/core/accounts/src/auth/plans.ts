import type { AnyPlan, AppPlan, AppStatus, Payload, Plan, PlanTokens } from '../contract'
import { errorMessage } from '@sand/util'
import { mkdir } from 'node:fs/promises'
import type { AppStatuses } from './app-status'
import { isKeyKind, signInError } from './kinds'
import type { Place, Places } from './places'

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
  places: Places
  save(statuses: AppStatuses): Promise<void>
  changed(): void
  dropped(plan: AppPlan): void
}

export const createPlans = ({ saved, places, save, changed, dropped }: PlansOptions) => {
  const plans = new Map<string, AnyPlan>()
  const statuses = new Map(Object.entries(saved))

  const keep = () => void save(Object.fromEntries(statuses)).catch(() => {})

  const check = async (plan: AppPlan) => {
    const found = await statusOf(plan)
    if (plans.get(plan.id) !== plan || JSON.stringify(found) === JSON.stringify(statuses.get(plan.id))) return
    statuses.set(plan.id, found)
    keep()
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

  const retire = (plan: AnyPlan | undefined) => {
    if (!isApp(plan)) return
    dropped(plan)
    plan.close?.()
  }

  const put = (plan: AnyPlan) => {
    retire(plans.get(plan.id))
    plans.set(plan.id, plan)
    if (isApp(plan)) void check(plan)
  }

  const drop = (plan: AnyPlan | undefined) => {
    if (!plan || plans.get(plan.id) !== plan) return
    retire(plan)
    plans.delete(plan.id)
  }

  const appPlace = ({ id }: Place) => ({ id, folder: places.folder(id) })

  const maker = (base: AnyPlan | undefined): ((place: Place) => AnyPlan) | undefined => {
    if (!base) return undefined
    if (!isApp(base)) return place => ({ ...base, id: place.id })
    const { another } = base
    return another && (place => another(appPlace(place)))
  }

  const others = (base: AnyPlan) => {
    const make = maker(base)
    return make ? places.of(base.id).map(make) : []
  }

  return {
    register(plan: AnyPlan) {
      if (isKeyKind(plan.id) || plan.id === 'server') throw new Error(`"${plan.id}" is taken by a built-in account`)
      const added = [plan, ...others(plan)]
      added.forEach(put)
      changed()
      return () => {
        if (plans.get(plan.id) !== plan) return
        const removed = [plan, ...places.of(plan.id).map(place => plans.get(place.id))]
        removed.forEach(drop)
        changed()
      }
    },
    async add(base: string) {
      const plan = plans.get(base)
      const make = maker(plan)
      if (!plan || !make) throw new Error(`${plan?.label ?? base} can't keep another account`)
      const place = await places.add(base, plan.label)
      if (isApp(plan)) await mkdir(places.folder(place.id), { recursive: true })
      const added = make(place)
      put(added)
      changed()
      return added
    },
    async rename(id: string, name: string) {
      await places.rename(id, name)
      changed()
    },
    async remove(id: string) {
      drop(plans.get(id))
      statuses.delete(id)
      keep()
      await places.remove(id)
      changed()
    },
    placeOf: (id: string) => places.get(id),
    nameOf: (id: string) => places.name(id),
    another: (id: string) => !!maker(plans.get(id)),
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
