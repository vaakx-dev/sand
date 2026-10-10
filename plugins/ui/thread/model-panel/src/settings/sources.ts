import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import { badge, div, secondaryAction, settingsSection, span, tile } from '@sand/dom'
import type { Kit } from './kit'
import { linkRow, logo, whereText } from './parts'
import { starIcon } from './star'

export const favouritesOf = (models: ModelInfo[]) =>
  models.filter(model => model.favourite !== undefined).sort((a, b) => (a.favourite ?? 0) - (b.favourite ?? 0))

export const sourcesKey = (kit: Kit) =>
  JSON.stringify([kit.ctx.models.sources(), favouritesOf(kit.ctx.models.list()).map(model => model.label)])

const favouritesRow = (kit: Kit) => {
  const names = favouritesOf(kit.ctx.models.list()).map(model => model.label)
  return linkRow({
    mark: tile(starIcon(true, 16)),
    title: 'Favourites',
    detail: names.length ? names.join(', ') : 'Star models to keep them at the top',
    onClick: () => kit.go({ kind: 'favourites' }),
  })
}

const sourceRow = (kit: Kit, source: SourceInfo) =>
  linkRow({
    mark: logo(source.provider),
    title: source.label,
    detail: whereText(source),
    end: [
      source.fresh > 0 ? badge('accent', `${source.fresh} new`) : null,
      span({ class: 'shrink-0 text-xs text-neutral-500' }, `${source.shown} of ${source.total} shown`),
    ],
    onClick: () => kit.go({ kind: 'source', id: source.id }),
  })

const emptyRow = (kit: Kit) =>
  div(
    { class: 'flex min-h-12 flex-wrap items-center gap-3 bg-neutral-900 px-4 py-3' },
    span({ class: 'min-w-0 flex-1 text-sm text-neutral-400' }, 'No accounts yet. Add one to choose models.'),
    secondaryAction({ size: 'sm', onClick: () => kit.ctx.settings?.open('accounts') }, 'Open Accounts'),
  )

export const sourcesSection = (kit: Kit) => {
  const sources = kit.ctx.models.sources()
  return settingsSection(
    { title: 'In the picker' },
    ...(sources.length ? [favouritesRow(kit), ...sources.map(source => sourceRow(kit, source))] : [emptyRow(kit)]),
  )
}
