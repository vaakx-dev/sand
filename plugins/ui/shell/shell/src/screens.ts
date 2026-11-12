import { collectScope, derive, disposeAll, span, untrack, type Child } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import { screenKey } from './address'
import type { BackTo, Route, RouteSpec, ScreenNav } from './contract'

type Title = (text: string | (() => string)) => HTMLElement

export interface Nav {
  label: string
  body: HTMLElement
}

export interface Built {
  key: string
  spec: RouteSpec
  head: HTMLElement
  main: HTMLElement
  nav?: Nav
  back?: BackTo
  split: boolean
  scope: Dispose[]
}

const navOf = ({ label, render }: ScreenNav): Nav => ({ label, body: render() })

const headOf = (head: Child, title: Title) => {
  if (typeof head === 'string') return head ? title(head) : null
  if (typeof head === 'function') return title(head as () => string)
  return head
}

export const screenCache = (specFor: (kind: string) => RouteSpec | undefined, routeOf: (key: string) => Route | undefined, title: Title) => {
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
        head: span({ class: 'flex min-w-0 flex-1 items-center gap-2' }, headOf(screen.head(), title)),
        main: screen.main(),
        ...(screen.nav && { nav: navOf(screen.nav) }),
        ...(screen.back && { back: screen.back }),
        split: Boolean(screen.split),
      }
    })
    return { key, spec, ...value, scope }
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
