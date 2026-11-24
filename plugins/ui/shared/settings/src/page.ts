import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, derive, div, dynamicChild, effect, onRaf, untrack, type Derive } from '@vaakx-dev/vrui'
import { settingAttribute, type SettingsPage } from './contract'
import { whenFound } from './integrations/appear'
import type { PageStore } from './pages'

export interface PageParts {
  store: PageStore
  page: Derive<SettingsPage | undefined>
}

const waitMs = 3000

const flashMs = 1600

const flashColor = `color-mix(in srgb, ${colorVar('accent', 500)} 22%, transparent)`

const flash = (row: Element) => {
  row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  row.animate(
    [
      { backgroundColor: flashColor, boxShadow: `0 0 0 8px ${flashColor}`, borderRadius: '6px' },
      { backgroundColor: 'transparent', boxShadow: '0 0 0 8px transparent', borderRadius: '6px' },
    ],
    { duration: flashMs, easing: 'ease-out' },
  )
}

const reveal = (root: HTMLElement, item: string) => whenFound(root, `[${settingAttribute}="${CSS.escape(item)}"]`, flash, waitMs)

export const pageView = (kit: Kit, { store, page }: PageParts) => {
  const sections = (above: boolean) =>
    dynamicChild(
      derive(() => store.sections.get().filter(section => section.page === page.get()?.id && (section.order ?? 0) < 0 === above)),
      shown => div({ class: 'contents' }, ...shown.map(section => section.render())),
    )
  const body = (shown: SettingsPage | undefined) => kit.pageBody({}, sections(true), shown?.render?.() ?? null, sections(false))
  const root = div({ 'data-part': 'settings', class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, dynamicChild(page, body))
  effect(() => {
    const wanted = store.target.get()
    if (!wanted || wanted.page !== page.get()?.id) return
    untrack(() => store.target.set(undefined))
    onRaf(() => reveal(root, wanted.item), root)
  })
  return root
}
