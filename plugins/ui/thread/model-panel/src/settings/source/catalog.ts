import type { ModelInfo } from '@sand/llm-accounts/contract'
import { effect, errorMessage, sig, untrack } from '@sand/dom'
import type { Kit } from '../kit'
import { settingsMenu } from '../menu'

const starred = Number.MAX_SAFE_INTEGER

export const createCatalog = (kit: Kit, source: string) => {
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
    return [...list].sort((a, b) => order.get(a.id)! - order.get(b.id)!)
  }

  const markSeen = (list: ModelInfo[]) => {
    for (const model of list) if (model.fresh) fresh.add(model.id)
    if (seen) return
    seen = true
    if (fresh.size) void kit.run({ type: 'models.seen', source })
  }

  const load = async () => {
    const mine = ++ticket
    try {
      const list = await kit.call<ModelInfo[]>({ type: 'models.catalog', source })
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
      kit.fail(failure)
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
    return send(kit.call({ type: 'models.pref', model: model.id, hidden }))
  }

  const setFavourite = (model: ModelInfo, favourite: boolean) => {
    patch(model.id, found => ({ ...found, favourite: favourite ? starred : undefined }))
    return send(kit.call({ type: 'models.pref', model: model.id, favourite }))
  }

  const remove = (model: ModelInfo) => {
    patch(model.id, () => undefined)
    return send(kit.call({ type: 'models.remove', model: model.id }))
  }

  const add = async (name: string) => {
    const model = await kit.call<ModelInfo>({ type: 'models.add', source, name })
    const known = models.get()?.some(found => found.id === model.id)
    if (known) patch(model.id, () => model)
    else models.set(arrange([...(models.get() ?? []), model]))
    return model
  }

  const menu = (model: ModelInfo, keep: (id: string) => void) =>
    settingsMenu(kit, model, {
      toggleFavourite: () => void setFavourite(model, model.favourite === undefined),
      toggleHidden: () => {
        keep(model.id)
        void setHidden(model, !model.hidden)
      },
      ...(model.added && { remove: () => void remove(model) }),
    })

  effect(() => {
    kit.changes.version.get()
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
