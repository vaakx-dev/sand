import { modelsAdd, modelsCatalog, modelsPref, modelsRemove, modelsSeen, type ModelInfo } from '@sand/accounts/contract'
import { errorMessage } from '@sand/util'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import { settingsMenu } from '../menu'
import type { Page } from '../page'

const starred = Number.MAX_SAFE_INTEGER

export const createCatalog = (page: Page, source: string) => {
  const models = sig<ModelInfo[] | undefined>(undefined)
  const error = sig('')
  const order = new Map<string, number>()
  const fresh = new Set<string>()
  let ticket = 0
  let pending = 0
  let stale = false
  let seen = false

  const arrange = (list: ModelInfo[]) => {
    for (const model of list) if (!order.has(model.id)) order.set(model.id, order.size)
    const rank = (model: ModelInfo) => order.get(model.id) ?? 0
    return [...list].sort((a, b) => rank(a) - rank(b))
  }

  const markSeen = (list: ModelInfo[]) => {
    for (const model of list) if (model.fresh) fresh.add(model.id)
    if (seen) return
    seen = true
    if (fresh.size) void page.run(modelsSeen, { source })
  }

  const load = async () => {
    const mine = ++ticket
    try {
      const list = await page.call(modelsCatalog, { source })
      if (mine !== ticket) return
      if (pending) {
        stale = true
        return
      }
      models.set(arrange(list))
      error.set('')
      markSeen(list)
    } catch (failure) {
      if (mine === ticket) error.set(errorMessage(failure))
    }
  }

  const patch = (id: string, change: (model: ModelInfo) => ModelInfo | undefined) =>
    models.update(list => list?.flatMap(model => (model.id === id ? (change(model) ?? []) : [model])))

  const send = async (work: Promise<unknown>) => {
    pending++
    try {
      await work
    } catch (failure) {
      page.fail(failure)
      stale = true
    } finally {
      pending--
      if (!pending && stale) {
        stale = false
        void load()
      }
    }
  }

  const setHidden = (model: ModelInfo, hidden: boolean) => {
    patch(model.id, found => ({ ...found, hidden }))
    return send(page.call(modelsPref, { model: model.id, hidden }))
  }

  const setFavourite = (model: ModelInfo, favourite: boolean) => {
    patch(model.id, found => ({ ...found, favourite: favourite ? starred : undefined }))
    return send(page.call(modelsPref, { model: model.id, favourite }))
  }

  const remove = (model: ModelInfo) => {
    patch(model.id, () => undefined)
    return send(page.call(modelsRemove, { model: model.id }))
  }

  const add = async (name: string) => {
    const model = await page.call(modelsAdd, { source, name })
    const known = models.get()?.some(found => found.id === model.id)
    if (known) patch(model.id, () => model)
    else models.set(arrange([...(models.get() ?? []), model]))
    return model
  }

  const menu = (model: ModelInfo, keep: (id: string) => void) =>
    settingsMenu(page, model, {
      toggleFavourite: () => void setFavourite(model, model.favourite === undefined),
      toggleHidden: () => {
        keep(model.id)
        void setHidden(model, !model.hidden)
      },
      ...(model.added && { remove: () => void remove(model) }),
    })

  effect(() => {
    page.changes.version.get()
    untrack(() => void load())
  })

  return {
    models,
    error,
    isNew: (model: ModelInfo) => !!model.fresh || fresh.has(model.id),
    reload: load,
    setHidden,
    setFavourite,
    remove,
    add,
    menu,
  }
}

export type Catalog = ReturnType<typeof createCatalog>
