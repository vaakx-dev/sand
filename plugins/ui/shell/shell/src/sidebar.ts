import { derive, div, dynamicChild, nav, span, type Derive, type Props } from '@vaakx-dev/vrui'
import { drawerLook, drawerOffset } from './drawer'
import { toolButton } from './frames'
import type { Model } from './model'
import { brand, footRow, groupList, navList, quietNavList } from './rows'
import type { Built, Nav } from './screens'

const appList = (model: Model, screenNav: Derive<Nav | undefined>) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: () => (screenNav.get() ? 'hidden' : 'flex min-h-0 flex-1 flex-col') },
    brand(model, false),
    navList(model, false),
    div(
      { class: 'relative flex min-h-0 flex-1 flex-col' },
      div({ class: '-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2' }, groupList(model, menu, { phone: false })),
      model.kit.scrollFade('z-10'),
    ),
    quietNavList(model, false),
    footRow(model, false),
    menu.view(),
  )
}

const screenList = (model: Model, { label, body }: Nav) => {
  const { icon, navButton } = model.kit
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    navButton(
      { class: 'group w-full shrink-0', onClick: () => model.leaveNav() },
      span({ class: 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100' }, icon('back')),
      span({ class: 'min-w-0 flex-1 truncate text-left' }, 'Back to chats'),
    ),
    div({ class: 'px-2 pt-3 pb-1 text-base font-semibold tracking-tight text-neutral-100' }, label),
    div({ class: 'flex min-h-0 flex-1 flex-col' }, body),
  )
}

const phoneList = (model: Model) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: 'flex min-h-0 flex-1 flex-col bg-neutral-950' },
    div(
      { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pt-2 pb-2', style: { scrollbarWidth: 'none' } },
      div({ class: 'flex items-center justify-between' }, brand(model, true), toolButton(model, 'Hide the sidebar', 'sidebar', () => model.setDrawer(false))),
      navList(model, true),
      groupList(model, menu, { phone: true }),
    ),
    div({ class: 'shrink-0 px-2 pb-1' }, quietNavList(model, true)),
    div({ class: 'shrink-0 px-2 pb-2' }, footRow(model, true)),
    menu.view(),
  )
}

export const phoneSidebar = (model: Model) =>
  nav(
    {
      'aria-label': 'Sidebar',
      class: () => ['flex h-full w-full flex-col', drawerLook(model)],
      style: () => drawerOffset(model),
      inert: () => !model.drawerOpen.get() && model.drawerDrag.get() === undefined,
    },
    phoneList(model),
  )

export const sidebar = (model: Model, screen: Derive<Built | undefined>, { class: extra, ...props }: Props<HTMLElement>) => {
  const screenNav = derive(() => screen.get()?.nav)
  return nav(
    { ...props, 'aria-label': 'Sidebar', class: ['flex h-full shrink-0 flex-col bg-neutral-950 px-2 py-2', extra], style: { width: '18rem' } },
    appList(model, screenNav),
    dynamicChild(screenNav, shown => (shown ? screenList(model, shown) : null)),
  )
}
