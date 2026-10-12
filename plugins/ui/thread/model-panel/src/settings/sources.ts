import type { SourceInfo } from '@sand/llm-accounts/contract'
import { favouritesOf } from '@sand/kit'
import { span } from '@vaakx-dev/vrui'
import type { Page } from './page'
import { linkRow, logo, whereText } from './parts'
import { starIcon } from './star'

export const sourcesKey = (page: Page) =>
  JSON.stringify([page.ctx.models.sources(), favouritesOf(page.ctx.models.list()).map(model => model.label)])

const favouritesRow = (page: Page) => {
  const { kit } = page.ctx
  const { tile } = kit
  const names = favouritesOf(page.ctx.models.list()).map(model => model.label)
  return linkRow(kit, {
    mark: tile(starIcon(true, 16)),
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
      span({ class: 'shrink-0 text-xs text-neutral-500' }, `${source.shown} of ${source.total} shown`),
    ],
    onClick: () => page.go({ kind: 'source', id: source.id }),
  })
}

const emptyRow = (page: Page) => {
  const { itemRow, secondaryAction } = page.ctx.kit
  return itemRow(
    {},
    null,
    'No accounts yet',
    'Add one to choose models',
    secondaryAction({ size: 'sm', onClick: () => page.ctx.settings?.open('accounts') }, 'Open Accounts'),
  )
}

export const sourcesSection = (page: Page) => {
  const { settingsSection } = page.ctx.kit
  const sources = page.ctx.models.sources()
  return settingsSection(
    { title: 'In the picker' },
    ...(sources.length ? [favouritesRow(page), ...sources.map(source => sourceRow(page, source))] : [emptyRow(page)]),
  )
}
