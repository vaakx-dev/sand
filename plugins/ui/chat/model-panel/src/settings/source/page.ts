import type { SourceInfo } from '@sand/accounts/contract'
import { div, dynamicChild, untrack } from '@vaakx-dev/vrui'
import { accountsButton } from '../accounts'
import type { Page } from '../page'
import { crumb, logo, sourceTitle } from '../parts'
import { createCatalog } from './catalog'
import { createFilter } from './filter'
import { modelsSection } from './models'
import { optionsSection } from './options'

const body = (page: Page, first: SourceInfo, latest: () => SourceInfo) => {
  const catalog = createCatalog(page, first.id)
  const filter = createFilter(first, catalog)
  return div({ class: 'flex flex-col gap-6' }, modelsSection(page.ctx.kit, first, catalog, filter), optionsSection(page, latest))
}

const gone = (page: Page) => {
  const { emptyState, settingsSection } = page.ctx.kit
  return settingsSection({}, emptyState({ surface: 'group', text: 'This account is no longer signed in.', action: accountsButton(page, 'Sign in again') }))
}

export const sourcePage = (page: Page, id: string) => {
  const { kit } = page.ctx
  const info = page.changes.read(() => page.source(id))
  return div(
    { class: 'flex flex-col gap-6' },
    crumb(page, logo(kit, untrack(() => info.get()?.provider)), () => {
      const source = info.get()
      return source ? sourceTitle(source) : id
    }),
    dynamicChild(
      info.map(found => !!found),
      () => {
        const first = info.get()
        return first ? body(page, first, () => info.get() ?? first) : gone(page)
      },
    ),
  )
}
