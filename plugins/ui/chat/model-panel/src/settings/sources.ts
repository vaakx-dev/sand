import type { SourceInfo } from '@sand/accounts/contract'
import { favouritesOf } from '@sand/model-picker/contract'
import { settingMark, type SettingsItem } from '@sand/settings/contract'
import { accountsAction } from './accounts'
import type { Page } from './page'
import { logo, whereText } from './parts'

const FAVOURITES_ITEM: SettingsItem = { id: 'favourites', label: 'Favourite models', keywords: ['star', 'starred', 'favorites'] }

const SOURCES_ITEM: SettingsItem = { id: 'model-accounts', label: 'Models in the picker', keywords: ['accounts', 'providers', 'hide', 'show', 'new models'] }

export const sourceItems = [FAVOURITES_ITEM, SOURCES_ITEM]

export const sourcesKey = (page: Page) =>
  JSON.stringify([page.ctx.models.known(), page.ctx.models.sources(), favouritesOf(page.ctx.models.list()).map(model => model.label)])

const favouritesRow = (page: Page) => {
  const { kit } = page.ctx
  const names = favouritesOf(page.ctx.models.list()).map(model => model.label)
  return kit.settingsRow({
    ...settingMark(FAVOURITES_ITEM.id),
    lead: kit.starMark(true),
    title: 'Favourites',
    detail: names.length ? names.join(', ') : 'None',
    onOpen: () => page.go({ kind: 'favourites' }),
  })
}

const countText = (source: SourceInfo) => [`${source.shown} of ${source.total} shown`, source.fresh > 0 && `${source.fresh} new`].filter(Boolean).join(', ')

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
    { ...settingMark(SOURCES_ITEM.id), title: 'In the picker' },
    ...(sources.length ? [favouritesRow(page), ...sources.map(source => sourceRow(page, source))] : noAccounts(page)),
  )
}
