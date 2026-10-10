import type { EffectiveSettings, ModelsUpdate, SessionSettings, SettingsState } from '@sand/model/contract'
import type { Models, Threads, Wire } from '../contract'
import type { Context } from 'drydock'
import type { Store } from '../threads/store'

const clean = (settings: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined && value !== null)) as SessionSettings

export const createModels = (ctx: Context, wire: Wire, threads: Threads, store: Store): Models => {
  let catalog: ModelsUpdate = { models: [], sources: [], levels: [], defaults: {} }
  let draft: SessionSettings = {}
  let draftState: SettingsState | undefined
  const asking = new Set<string>()
  const changed = () => ctx.emit('models.change')

  const refreshDraft = () =>
    void wire.call<SettingsState>({ type: 'settings.get', settings: draft }).then(state => {
      draftState = state
      changed()
    }, () => {})

  const fetch = (thread: string) => {
    if (asking.has(thread)) return
    asking.add(thread)
    void wire
      .call<SettingsState>({ type: 'settings.get', session: thread })
      .then(state => {
        store.settings.set(thread, state)
        changed()
      }, () => {})
      .finally(() => asking.delete(thread))
  }

  ctx.on('wire.hello', hello => {
    catalog = { models: hello.models ?? [], sources: hello.sources ?? [], levels: hello.levels ?? [], defaults: hello.defaults ?? {} }
    store.settings.clear()
    refreshDraft()
    changed()
  })
  ctx.on('wire.event', event => {
    if (event.name === 'models.change') {
      catalog = { ...event.args[0], sources: event.args[0].sources ?? [] }
      store.settings.clear()
      refreshDraft()
      changed()
    }
    if (event.name === 'settings.change') {
      store.settings.set(...event.args)
      changed()
    }
  })

  const info = (id?: string) => catalog.models.find(model => model.id === id)

  const state = (thread = threads.current()?.id) => {
    if (!thread) return draftState
    const known = store.settings.get(thread)
    if (!known) fetch(thread)
    return known
  }

  const label = (settings: EffectiveSettings) =>
    [
      info(settings.model)?.label ?? settings.model,
      catalog.levels.find(level => level.id === settings.effort)?.label,
      settings.speed === 'fast' && 'Fast',
    ]
      .filter(Boolean)
      .join(' · ')

  const summary = (settings: SessionSettings) => {
    const model = settings.model ?? catalog.defaults.model
    const known = info(model)
    const effort = settings.effort && known?.efforts.includes(settings.effort) ? settings.effort : undefined
    return [known?.label ?? model ?? 'the default model', catalog.levels.find(level => level.id === effort)?.label, settings.speed === 'fast' && known?.fast && 'Fast']
      .filter(Boolean)
      .join(' · ')
  }

  return {
    list: () => catalog.models,
    sources: () => catalog.sources,
    levels: () => catalog.levels,
    info,
    defaults: () => catalog.defaults,
    state,
    settings: thread => state(thread)?.current,
    label,
    summary,
    describe(thread) {
      const current = state(thread)?.current
      return current && label(current)
    },
    draft: () => draft,
    prepare(patch) {
      draft = patch ? clean({ ...draft, ...patch }) : {}
      refreshDraft()
      changed()
    },
  }
}
