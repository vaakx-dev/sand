import { div, dynamicChild, nav, span, type Props } from '@vaakx-dev/vrui'
import type { Model } from './model'
import { brandLook, footRow, groupList, navList } from './rows'
import type { Nav } from './screens'

const scroll = (...children: HTMLElement[]) => div({ class: '-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2' }, ...children)

const screenNav = (model: Model) => () => model.screen.get()?.nav

const appList = (model: Model) => {
  const menu = model.kit.contextMenu()
  return div(
    { class: () => (screenNav(model)() ? 'hidden' : 'flex min-h-0 flex-1 flex-col') },
    div({ class: [brandLook, 'text-base'] }, 'sand'),
    navList(model, false),
    scroll(groupList(model, menu, { phone: false })),
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
    div({ class: [brandLook, 'pt-3 text-base'] }, label),
    div({ class: 'flex min-h-0 flex-1 flex-col' }, body),
  )
}

export const sidebar = (model: Model, { class: extra, ...props }: Props<HTMLElement>) =>
  nav(
    { ...props, 'aria-label': 'Sidebar', class: ['flex h-full shrink-0 flex-col bg-neutral-950 px-2 py-2', extra], style: { width: '18rem' } },
    appList(model),
    dynamicChild(screenNav(model), shown => (shown ? screenList(model, shown) : null)),
  )
