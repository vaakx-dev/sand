import { modelsPref, modelsRemove, type ModelInfo } from '@sand/accounts/contract'
import { favouritesOf } from '@sand/model-picker/models'
import { derive, div, show, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { settingsMenu } from './menu'
import type { Page } from './page'
import { crumb, logo } from './parts'
import { starButton } from './star'

const whereText = (model: ModelInfo) => (model.via ? `On ${model.via}` : '')

const menuOf = (page: Page, model: ModelInfo, unstar: (model: ModelInfo) => void) =>
  settingsMenu(page, model, {
    toggleFavourite: () => unstar(model),
    toggleHidden: () => void page.run(modelsPref, { model: model.id, hidden: !model.hidden }),
    ...(model.added && { remove: () => void page.run(modelsRemove, { model: model.id }) }),
  })

const favouriteRow = (page: Page, row: Sig<ModelInfo>, unstar: (model: ModelInfo) => void) => {
  const { kit } = page.ctx
  const { contextMenu, settingsRow } = kit
  const menu = contextMenu()
  return settingsRow(
    {
      ...menu.target(() => menuOf(page, row.get(), unstar)),
      lead: logo(kit, untrack(() => row.get().provider)),
      title: () => row.get().label,
      detail: () => whereText(row.get()),
    },
    starButton(kit, untrack(() => row.get().label), true, () => unstar(row.get())),
    menu.view(),
  )
}

export const favouritesPage = (page: Page) => {
  const { emptyState, rowList, secondaryAction, settingsSection, starMark } = page.ctx.kit
  const removed = sig(new Set<string>())
  const all = page.changes.read(() => page.ctx.models.list())
  const models = derive(() => {
    const gone = removed.get()
    return favouritesOf(all.get()).filter(model => !gone.has(model.id))
  })
  const unstar = (model: ModelInfo) => {
    removed.update(set => new Set(set).add(model.id))
    page.call(modelsPref, { model: model.id, favourite: false }).catch(failure => {
      page.fail(failure)
      removed.update(set => new Set([...set].filter(id => id !== model.id)))
    })
  }
  return div(
    { class: 'flex flex-col gap-6' },
    crumb(page, starMark(true), 'Favourites'),
    settingsSection(
      {},
      show(
        models.map(found => !found.length),
        () =>
          emptyState({
            surface: 'group',
            text: 'No favourites yet. Star models in an account to keep them at the top of the picker.',
            action: secondaryAction({ size: 'sm', onClick: () => page.go({ kind: 'top' }) }, 'Choose an account'),
          }),
      ),
      rowList(models, model => model.id, row => favouriteRow(page, row, unstar)),
    ),
  )
}
