import type { ModelInfo } from '@sand/llm-accounts/contract'
import { favouritesOf } from '@sand/kit'
import { derive, div, show, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { settingsMenu } from './menu'
import type { Page } from './page'
import { crumb, logo } from './parts'
import { starButton, starIcon } from './star'

const sourceText = (page: Page, model: ModelInfo) => {
  const via = model.via ? `on ${model.via}` : ''
  return [page.sourceLabel(model), via].filter(Boolean).join(' ')
}

const menuOf = (page: Page, model: ModelInfo, unstar: (model: ModelInfo) => void) =>
  settingsMenu(page, model, {
    toggleFavourite: () => unstar(model),
    toggleHidden: () => void page.run({ type: 'models.pref', model: model.id, hidden: !model.hidden }),
    ...(model.added && { remove: () => void page.run({ type: 'models.remove', model: model.id }) }),
  })

const favouriteRow = (page: Page, row: Sig<ModelInfo>, unstar: (model: ModelInfo) => void) => {
  const { kit } = page.ctx
  const { contextMenu, itemRow } = kit
  const menu = contextMenu()
  return itemRow(
    menu.target(() => menuOf(page, row.get(), unstar)),
    logo(kit, untrack(() => row.get().provider)),
    () => row.get().label,
    () => sourceText(page, row.get()),
    starButton(kit, untrack(() => row.get().label), true, () => unstar(row.get())),
    menu.view(),
  )
}

export const favouritesPage = (page: Page) => {
  const { hintRow, rowList, settingsSection } = page.ctx.kit
  const removed = sig(new Set<string>())
  const all = page.changes.read(() => page.ctx.models.list())
  const models = derive(() => {
    const gone = removed.get()
    return favouritesOf(all.get()).filter(model => !gone.has(model.id))
  })
  const unstar = (model: ModelInfo) => {
    removed.update(set => new Set(set).add(model.id))
    page.call({ type: 'models.pref', model: model.id, favourite: false }).catch(failure => {
      page.fail(failure)
      removed.update(set => new Set([...set].filter(id => id !== model.id)))
    })
  }
  return div(
    { class: 'flex flex-col gap-6' },
    crumb(page, starIcon(true, 14), 'Favourites'),
    settingsSection(
      {},
      show(
        models.map(found => !found.length),
        () => hintRow('No favourites yet. Star a model in one of your accounts to keep it at the top of the picker'),
      ),
      rowList(models, model => model.id, row => favouriteRow(page, row, unstar)),
    ),
  )
}
