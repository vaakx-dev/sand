import type { Kit } from '@sand/ui-kit/contract'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
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
  const list = (onPhone: boolean) => listView(kit, { store, current, choose, phone: onPhone })
  return {
    head: () => dynamicChild(phone, onPhone => (onPhone ? kit.barTitle(() => (id ? (page.get()?.label ?? '') : 'Settings')) : null)),
    nav: { label: 'Settings', render: () => list(false) },
    main: () =>
      div(
        { class: 'flex min-h-0 min-w-0 flex-1' },
        dynamicChild(phone, onPhone => (onPhone && !id ? list(true) : pageView(kit, { store, page, titled, choose }))),
      ),
  }
}
