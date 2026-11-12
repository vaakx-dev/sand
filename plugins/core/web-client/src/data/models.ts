import {
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
import type { Pcs, Wire, WireListen } from '@sand/devices-contract'
import type { Context } from 'drydock'
import { type Models, modelsChange, type Threads } from '../contract'
import { type HelloRead, helloOf, onPcHello } from '../greeted'
import type { Store } from '../threads/store'

const empty: ModelsUpdate = { models: [], sources: [], levels: [], defaults: {} }

const fromHello = (read: HelloRead): ModelsUpdate => ({
  models: read(helloModels) ?? [],
  sources: read(helloSources) ?? [],
  levels: read(helloLevels) ?? [],
  defaults: read(helloDefaults) ?? {},
})

const everyPc: WireListen = { from: 'all' }

export interface DeviceModels extends Models {
  forget(device: string): void
}

export const createModels = (ctx: Context, wire: Wire, pcs: Pcs, threads: Threads, store: Store): DeviceModels => {
  const catalogs = new Map<string, ModelsUpdate>()
  let defaultState: SettingsState | undefined
  const asking = new Set<string>()
  const changed = () => ctx.emit(modelsChange)

  const knownCatalog = (device = store.device()) => catalogs.get(device) ?? catalogs.get(store.here())

  const catalogOf = (device?: string) => knownCatalog(device) ?? empty

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
    if (device === store.device() && wire.hello(helloDefaults, device) !== undefined) refreshDefaults()
    changed()
  }

  onPcHello(ctx, wire, pcs, pc => useCatalog(pc, fromHello(helloOf(wire, pc))))
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

  const labelOn = (device: string, { model, effort, speed }: SessionSettings) =>
    [infoOn(device, model)?.label ?? model ?? 'Choose a model', catalogOf(device).levels.find(level => level.id === effort)?.label, speed === 'fast' && 'Fast']
      .filter(Boolean)
      .join(' � ')

  const summary = (settings: SessionSettings) => {
    const model = settings.model ?? catalogOf().defaults.model
    if (!model) return 'no model chosen'
    const known = infoOn(store.device(), model)
    const effort = settings.effort && known?.efforts.includes(settings.effort) ? settings.effort : undefined
    return labelOn(store.device(), { model, ...(effort && { effort }), ...(settings.speed === 'fast' && known?.fast && { speed: 'fast' }) })
  }

  return {
    device: () => store.device(),
    list: () => catalogOf().models,
    known: () => knownCatalog() !== undefined,
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
    forget(device) {
      if (!catalogs.delete(device)) return
      changed()
    },
  }
}
