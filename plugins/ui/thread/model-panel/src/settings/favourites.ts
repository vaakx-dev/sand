import type { ModelInfo } from '@sand/llm-accounts/contract'
import { derive, div, hint, list, settingsSection, show, sig, span, untrack, type Sig } from '@sand/dom'
import type { Kit } from './kit'
import { crumb, logo } from './parts'
import { favouritesOf } from './sources'
import { starButton, starIcon } from './star'

const sourceText = (kit: Kit, model: ModelInfo) => {
  const via = model.via ? `on ${model.via}` : ''
  return [kit.sourceLabel(model), via].filter(Boolean).join(' ')
}

const favouriteRow = (kit: Kit, row: Sig<ModelInfo>, unstar: (model: ModelInfo) => void) =>
  div(
    { class: 'flex min-h-12 items-center gap-3 bg-neutral-900 py-2 pr-3 pl-4' },
    logo(untrack(() => row.get().provider)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm text-neutral-100' }, () => row.get().label),
      span({ class: 'truncate text-xs text-neutral-500' }, () => sourceText(kit, row.get())),
    ),
    starButton(untrack(() => row.get().label), true, () => unstar(row.get())),
  )

export const favouritesPage = (kit: Kit) => {
  const removed = sig(new Set<string>())
  const all = kit.changes.read(() => kit.ctx.models.list())
  const models = derive(() => {
    const gone = removed.get()
    return favouritesOf(all.get()).filter(model => !gone.has(model.id))
  })
  const unstar = (model: ModelInfo) => {
    removed.update(set => new Set(set).add(model.id))
    kit.call({ type: 'models.pref', model: model.id, favourite: false }).catch(failure => {
      kit.fail(failure)
      removed.update(set => new Set([...set].filter(id => id !== model.id)))
    })
  }
  return div(
    { class: 'flex flex-col gap-6' },
    crumb(kit, starIcon(true, 14), 'Favourites'),
    settingsSection(
      {},
      show(
        models.map(found => !found.length),
        () => div({ class: 'bg-neutral-900' }, hint('No favourites yet. Star a model in one of your accounts to keep it at the top of the picker.')),
      ),
      list(models, model => model.id, row => favouriteRow(kit, row, unstar), div({ class: 'contents' })),
    ),
  )
}
