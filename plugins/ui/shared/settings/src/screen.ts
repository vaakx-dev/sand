import type { Kit } from '@sand/ui-kit/contract'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, span } from '@vaakx-dev/vrui'
import { listView } from './list'
import { pageView } from './page'
import type { PageStore } from './pages'

export interface ScreenParts {
  store: PageStore
  shell: Shell
  choose(id: string): void
}

export const settingsScreen = (kit: Kit, { store, shell, choose }: ScreenParts, route: () => Route): Screen => {
  const id = route().id
  const phone = derive(() => shell.state() === 'phone')
  const page = derive(() => (phone.get() && !id ? undefined : store.pick(id)))
  const titled = () => !phone.get()
  const current = () => page.get()?.id
  const list = (look: string) => listView(kit, { store, current, choose, class: look })
  return {
    head: () => span({ class: 'ml-2 flex min-w-0 flex-1' }, kit.headTitle(2, () => (phone.get() && id ? (page.get()?.label ?? '') : 'Settings'))),
    main: () =>
      div(
        { class: 'flex min-h-0 min-w-0 flex-1' },
        dynamicChild(phone, onPhone => {
          if (onPhone && !id) return list('flex-1')
          const shown = pageView(kit, { store, page, titled, choose })
          return onPhone ? shown : div({ class: 'flex min-h-0 min-w-0 flex-1' }, list('w-48 shrink-0 border-r border-neutral-800 lg:w-64'), shown)
        }),
      ),
  }
}
