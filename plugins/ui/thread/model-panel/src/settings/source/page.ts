import type { SourceInfo } from '@sand/llm-accounts/contract'
import { div, dynamicChild, untrack } from '@vaakx-dev/vrui'
import type { Page } from '../page'
import { crumb, whereText } from '../parts'
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
  const { hintRow, settingsSection } = page.ctx.kit
  return settingsSection({}, hintRow('This account is no longer signed in'))
}

const title = (source: SourceInfo | undefined, id: string) => {
  if (!source) return id
  const where = whereText(source)
  return where ? `${source.label} ${where}` : source.label
}

export const sourcePage = (page: Page, id: string) => {
  const { providerIcon } = page.ctx.kit
  const info = page.changes.read(() => page.source(id))
  return div(
    { class: 'flex flex-col gap-6' },
    crumb(page, providerIcon(untrack(() => info.get()?.provider), 14), () => title(info.get(), id)),
    dynamicChild(
      info.map(found => !!found),
      () => {
        const first = info.get()
        return first ? body(page, first, () => info.get() ?? first) : gone(page)
      },
    ),
  )
}
