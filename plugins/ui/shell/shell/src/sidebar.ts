import { derive, div, dynamicChild, nav, type Child, type Derive, type Props } from '@vaakx-dev/vrui'
import { drawerLook, drawerOffset } from './drawer'
import type { Model } from './model'
import { brand, footRow, groupList, navList, quietNavList } from './rows'
import type { Built, Nav } from './screens'

const scroller = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ ...props, class: ['flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2', extra] }, ...children)

const appList = (model: Model, screenNav: Derive<Nav | undefined>) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: () => (screenNav.get() ? 'hidden' : 'flex min-h-0 flex-1 flex-col') },
    brand(model, false),
    navList(model, false),
    div(
      { class: 'relative flex min-h-0 flex-1 flex-col' },
      scroller({ class: '-mx-2' }, groupList(model, menu, { phone: false })),
      model.kit.scrollFade('z-10'),
    ),
    quietNavList(model, false),
    footRow(model, false),
    menu.view(),
  )
}

const screenList = (model: Model, { label, body }: Nav) => {
  const { backButton, sheetTitle } = model.kit
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div({ class: '-mt-2 flex h-12 shrink-0 items-center gap-1' }, backButton({ title: 'Back to chats', onClick: () => model.leaveNav() }), sheetTitle(label)),
    div({ class: 'flex min-h-0 flex-1 flex-col' }, body),
  )
}

const phoneList = (model: Model) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: 'flex min-h-0 flex-1 flex-col bg-neutral-950' },
    div({ class: 'flex shrink-0 items-center justify-between px-2 pt-2' }, brand(model, true), model.kit.closeButton({ title: 'Hide the sidebar', onClick: () => model.setDrawer(false) })),
    scroller(
      { class: 'overscroll-contain', style: { scrollbarWidth: 'none' } },
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
      'data-part': 'sidebar',
      class: () => ['flex h-full w-full flex-col', drawerLook(model)],
      style: () => drawerOffset(model),
      inert: () => !model.drawerOpen.get() && model.drawerDrag.get() === undefined,
    },
    phoneList(model),
  )

export const sidebar = (model: Model, screen: Derive<Built | undefined>, { class: extra, ...props }: Props<HTMLElement>) => {
  const screenNav = derive(() => screen.get()?.nav)
  return nav(
    { ...props, 'aria-label': 'Sidebar', 'data-part': 'sidebar', class: ['flex h-full shrink-0 flex-col bg-neutral-950 px-2 py-2', extra], style: { width: '18rem' } },
    appList(model, screenNav),
    dynamicChild(screenNav, shown => (shown ? screenList(model, shown) : null)),
  )
}
