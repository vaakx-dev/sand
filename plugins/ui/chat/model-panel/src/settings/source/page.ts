import type { SourceInfo } from '@sand/accounts/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import { accountsAction } from '../accounts'
import type { Page } from '../page'
import { createCatalog } from './catalog'
import { createFilter } from './filter'
import { modelsSection } from './models'
import { optionsSection } from './options'

const body = (page: Page, first: SourceInfo, latest: () => SourceInfo) => {
  const catalog = createCatalog(page, first.id)
  const filter = createFilter(first, catalog)
  return div({ class: 'flex flex-col gap-6' }, modelsSection(page.ctx.kit, first, catalog, filter), optionsSection(page, latest))
}

const gone = (page: Page) => page.ctx.kit.emptyState({ text: 'This account is signed out.', action: accountsAction(page, 'Sign in again') })

export const sourcePage = (page: Page, id: string) => {
  const info = page.changes.read(() => page.source(id))
  return dynamicChild(
    info.map(found => !!found),
    () => {
      const first = info.get()
      return first ? body(page, first, () => info.get() ?? first) : gone(page)
    },
  )
}
