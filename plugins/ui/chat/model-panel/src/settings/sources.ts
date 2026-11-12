import type { SourceInfo } from '@sand/accounts/contract'
import { favouritesOf } from '@sand/model-picker/contract'
import { accountsAction } from './accounts'
import type { Page } from './page'
import { logo, whereText } from './parts'

export const sourcesKey = (page: Page) =>
  JSON.stringify([page.ctx.models.known(), page.ctx.models.sources(), favouritesOf(page.ctx.models.list()).map(model => model.label)])

const favouritesRow = (page: Page) => {
  const { kit } = page.ctx
  const names = favouritesOf(page.ctx.models.list()).map(model => model.label)
  return kit.settingsRow({
    lead: kit.starMark(true),
    title: 'Favourites',
    detail: names.length ? names.join(', ') : 'Star models to keep them at the top',
    onOpen: () => page.go({ kind: 'favourites' }),
  })
}

const countText = (source: SourceInfo) => [`Shown ${source.shown} of ${source.total}`, source.fresh > 0 && `${source.fresh} new`].filter(Boolean).join(', ')

const sourceRow = (page: Page, source: SourceInfo) => {
  const { kit } = page.ctx
  return kit.settingsRow({
    lead: logo(kit, source.provider),
    title: source.label,
    detail: [whereText(source), countText(source)].filter(Boolean).join(' · '),
    onOpen: () => page.go({ kind: 'source', id: source.id }),
  })
}

const noAccounts = (page: Page) =>
  page.ctx.models.known() ? [page.ctx.kit.emptyState({ text: 'No accounts yet.', action: accountsAction(page, 'Add an account') })] : []

export const sourcesSection = (page: Page) => {
  const { settingsSection } = page.ctx.kit
  const sources = page.ctx.models.sources()
  return settingsSection(
    { title: 'In the picker' },
    ...(sources.length ? [favouritesRow(page), ...sources.map(source => sourceRow(page, source))] : noAccounts(page)),
  )
}
