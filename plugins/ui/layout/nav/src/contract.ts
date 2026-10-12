import type { Handle, NavAction, NavList } from '@sand/protocol'
import type { Derive } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'

export interface NavHost {
  list(list: NavList): Handle<NavList>
  action(action: NavAction): Dispose
  lists: Derive<NavList[]>
  actions: Derive<NavAction[]>
  busy(id: string): boolean
  run(action: NavAction): void
}

declare module 'drydock' {
  interface Services {
    nav: NavHost
    sidebar: object
  }
}
