import {
  type EffectiveSettings,
  helloDefaults,
  helloLevels,
  helloModels,
  helloSources,
  type ModelsUpdate,
  modelsChange as modelsUpdate,
  type SessionSettings,
  settingsChange,
  settingsGet,
  type SettingsState,
} from '@sand/model/contract'
import type { Context } from 'drydock'
import { type Models, modelsChange, type Threads, type Wire, wireHello } from '../contract'
import type { Store } from '../threads/store'
import type { HelloRead } from '../wire/hellos'

const empty: ModelsUpdate = { models: [], sources: [], levels: [], defaults: {} }

const fromHello = (read: HelloRead): ModelsUpdate => ({
  models: read(helloModels) ?? [],
  sources: read(helloSources) ?? [],
  levels: read(helloLevels) ?? [],
  defaults: read(helloDefaults) ?? {},
})

const everyPc = { remotes: true }

export interface DeviceModels extends Models {
  hello(device: string, read: HelloRead): void
  forget(device: string): void
}

export const createModels = (ctx: Context, wire: Wire, threads: Threads, store: Store): DeviceModels => {
  const catalogs = new Map<string, ModelsUpdate>()
  let defaultState: SettingsState | undefined
  const asking = new Set<string>()
  const changed = () => ctx.emit(modelsChange)

  const catalogOf = (device = store.device()) => catalogs.get(device) ?? catalogs.get(store.here()) ?? empty

  const refreshDefaults = () =>
    void wire.call(settingsGet, { settings: {} }).then(state => {
      defaultState = state
      changed()
    }, () => {})

  const askSettings = (thread: string) => {
    if (asking.has(thread)) return
    asking.add(thread)
    void wire
      .call(settingsGet, { session: thread })
      .then(state => {
        store.settings.set(thread, state)
        changed()
      }, () => {})
      .finally(() => asking.delete(thread))
  }

  const useCatalog = (device: string, next: ModelsUpdate) => {
    catalogs.set(device, next)
    for (const thread of [...store.settings.keys()]) if (store.deviceOf(thread) === device) store.settings.delete(thread)
    if (device === store.device()) refreshDefaults()
    changed()
  }

  ctx.on(wireHello, () => useCatalog(store.here(), fromHello(field => wire.hello(field))))
  ctx.effect(() => wire.on(modelsUpdate, (update, device) => useCatalog(device, { ...update, sources: update.sources ?? [] }), everyPc))
  ctx.effect(() =>
    wire.on(
      settingsChange,
      ([thread, state]) => {
        store.settings.set(thread, state)
        changed()
      },
      everyPc,
    ),
  )

  const infoOn = (device: string, id?: string) => catalogOf(device).models.find(model => model.id === id)

  const state = (thread = threads.current()?.id) => {
    if (!thread) return defaultState
    const known = store.settings.get(thread)
    if (!known) askSettings(thread)
    return known
  }

  const labelOn = (device: string, settings: EffectiveSettings) =>
    [
      infoOn(device, settings.model)?.label ?? settings.model,
      catalogOf(device).levels.find(level => level.id === settings.effort)?.label,
      settings.speed === 'fast' && 'Fast',
    ]
      .filter(Boolean)
      .join(' · ')

  const summary = (settings: SessionSettings) => {
    const catalog = catalogOf()
    const model = settings.model ?? catalog.defaults.model
    const known = infoOn(store.device(), model)
    const effort = settings.effort && known?.efforts.includes(settings.effort) ? settings.effort : undefined
    return [known?.label ?? model ?? 'no model chosen', catalog.levels.find(level => level.id === effort)?.label, settings.speed === 'fast' && known?.fast && 'Fast']
      .filter(Boolean)
      .join(' · ')
  }

  return {
    device: () => store.device(),
    list: () => catalogOf().models,
    sources: () => catalogOf().sources,
    levels: () => catalogOf().levels,
    info: id => infoOn(store.device(), id),
    defaults: () => catalogOf().defaults,
    state,
    settings: thread => state(thread)?.current,
    label: settings => labelOn(store.device(), settings),
    summary,
    describe(thread) {
      const current = state(thread)?.current
      return current && labelOn(thread ? store.deviceOf(thread) : store.device(), current)
    },
    hello: (device, read) => useCatalog(device, fromHello(read)),
    forget(device) {
      if (!catalogs.delete(device)) return
      changed()
    },
  }
}
