import type { SourceInfo } from '@sand/accounts/contract'
import { favouritesOf } from '@sand/model-picker/models'
import { span } from '@vaakx-dev/vrui'
import { accountsButton } from './accounts'
import type { Page } from './page'
import { linkRow, logo, whereText } from './parts'

export const sourcesKey = (page: Page) =>
  JSON.stringify([page.ctx.models.sources(), favouritesOf(page.ctx.models.list()).map(model => model.label)])

const favouritesRow = (page: Page) => {
  const { kit } = page.ctx
  const names = favouritesOf(page.ctx.models.list()).map(model => model.label)
  return linkRow(kit, {
    mark: kit.starMark(true),
    title: 'Favourites',
    detail: names.length ? names.join(', ') : 'Star models to keep them at the top',
    onClick: () => page.go({ kind: 'favourites' }),
  })
}

const sourceRow = (page: Page, source: SourceInfo) => {
  const { kit } = page.ctx
  const { badge } = kit
  return linkRow(kit, {
    mark: logo(kit, source.provider),
    title: source.label,
    detail: whereText(source),
    end: [
      source.fresh > 0 ? badge('accent', `${source.fresh} new`) : null,
      span({ class: 'tabular-nums' }, `Shown ${source.shown} of ${source.total}`),
    ],
    onClick: () => page.go({ kind: 'source', id: source.id }),
  })
}

const noAccounts = (page: Page) =>
  page.ctx.kit.emptyState({ surface: 'group', text: 'No accounts yet. Add one to choose models.', action: accountsButton(page, 'Add an account') })

export const sourcesSection = (page: Page) => {
  const { settingsSection } = page.ctx.kit
  const sources = page.ctx.models.sources()
  return settingsSection(
    { title: 'In the picker' },
    ...(sources.length ? [favouritesRow(page), ...sources.map(source => sourceRow(page, source))] : [noAccounts(page)]),
  )
}
