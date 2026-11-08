import { collectScope, derive, disposeAll, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import { screenKey } from './address'
import type { Route, RouteSpec, SideFrame } from './contract'

export interface Side {
  label: string
  mainLabel: string
  actions?: HTMLElement
  body: HTMLElement
}

export interface Built {
  key: string
  spec: RouteSpec
  head: HTMLElement
  main: HTMLElement
  side?: Side
  showing: Sig<'main' | 'side'>
  scope: Dispose[]
}

const sideOf = ({ label, mainLabel, actions, render }: SideFrame): Side => ({
  label,
  mainLabel,
  ...(actions && { actions: span({ class: 'flex shrink-0 items-center gap-1' }, actions()) }),
  body: render(),
})

export const screenCache = (specFor: (kind: string) => RouteSpec | undefined, routeOf: (key: string) => Route | undefined) => {
  const built = new Map<string, Built>()

  const drop = (entry: Built) => {
    built.delete(entry.key)
    disposeAll(entry.scope)
  }

  const create = (key: string, spec: RouteSpec, first: Route): Built => {
    const { value, scope } = collectScope(() => {
      let last = first
      const route = derive(() => (last = routeOf(key) ?? last))
      const screen = spec.render(() => route.get())
      return {
        head: span({ class: 'flex min-w-0 flex-1 items-center gap-2' }, screen.head()),
        main: screen.main(),
        ...(screen.side && { side: sideOf(screen.side) }),
      }
    })
    return { key, spec, ...value, showing: sig('main'), scope }
  }

  const get = (route: Route) => {
    const spec = specFor(route.kind)
    if (!spec) return undefined
    return untrack(() => {
      const key = screenKey(route)
      const found = built.get(key)
      if (found?.spec === spec) return found
      if (found) drop(found)
      const made = create(key, spec, route)
      built.set(key, made)
      return made
    })
  }

  const keep = (keys: Set<string>) => {
    for (const entry of [...built.values()]) if (!keys.has(entry.key)) drop(entry)
  }

  return { get, keep, clear: () => keep(new Set()) }
}

export type Screens = ReturnType<typeof screenCache>
