import type { ModelInfo } from '@sand/llm-accounts/contract'
import { contextMenu, derive, div, hintRow, itemRow, rowList, settingsSection, show, sig, untrack, type Sig } from '@sand/dom'
import { favouritesOf } from '@sand/kit'
import type { Kit } from './kit'
import { settingsMenu } from './menu'
import { crumb, logo } from './parts'
import { starButton, starIcon } from './star'

const sourceText = (kit: Kit, model: ModelInfo) => {
  const via = model.via ? `on ${model.via}` : ''
  return [kit.sourceLabel(model), via].filter(Boolean).join(' ')
}

const menuOf = (kit: Kit, model: ModelInfo, unstar: (model: ModelInfo) => void) =>
  settingsMenu(kit, model, {
    toggleFavourite: () => unstar(model),
    toggleHidden: () => void kit.run({ type: 'models.pref', model: model.id, hidden: !model.hidden }),
    ...(model.added && { remove: () => void kit.run({ type: 'models.remove', model: model.id }) }),
  })

const favouriteRow = (kit: Kit, row: Sig<ModelInfo>, unstar: (model: ModelInfo) => void) => {
  const menu = contextMenu()
  return itemRow(
    menu.target(() => menuOf(kit, row.get(), unstar)),
    logo(untrack(() => row.get().provider)),
    () => row.get().label,
    () => sourceText(kit, row.get()),
    starButton(untrack(() => row.get().label), true, () => unstar(row.get())),
    menu.view(),
  )
}

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
        () => hintRow('No favourites yet. Star a model in one of your accounts to keep it at the top of the picker'),
      ),
      rowList(models, model => model.id, row => favouriteRow(kit, row, unstar)),
    ),
  )
}
