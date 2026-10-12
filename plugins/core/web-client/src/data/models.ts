import type { EffectiveSettings, ModelsUpdate, SessionSettings, SettingsState } from '@sand/model/contract'
import type { Hello, WireEvent } from '@sand/protocol'
import type { Models, Threads, Wire } from '../contract'
import type { Context } from 'drydock'
import type { Store } from '../threads/store'

const clean = (settings: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined && value !== null)) as SessionSettings

const empty: ModelsUpdate = { models: [], sources: [], levels: [], defaults: {} }

const fromHello = (hello: Hello): ModelsUpdate => ({ models: hello.models ?? [], sources: hello.sources ?? [], levels: hello.levels ?? [], defaults: hello.defaults ?? {} })

export interface DeviceModels extends Models {
  hello(device: string, hello: Hello): void
  event(device: string, event: WireEvent): void
  forget(device: string): void
}

export const createModels = (ctx: Context, wire: Wire, threads: Threads, store: Store): DeviceModels => {
  const catalogs = new Map<string, ModelsUpdate>()
  let draft: SessionSettings = {}
  let draftState: SettingsState | undefined
  const asking = new Set<string>()
  const changed = () => ctx.emit('models.change')

  const catalogOf = (device = store.device()) => catalogs.get(device) ?? catalogs.get(store.here()) ?? empty

  const refreshDraft = () =>
    void wire.call<SettingsState>({ type: 'settings.get', settings: draft }).then(state => {
      draftState = state
      changed()
    }, () => {})

  const askSettings = (thread: string) => {
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

  const useCatalog = (device: string, next: ModelsUpdate) => {
    catalogs.set(device, next)
    for (const thread of [...store.settings.keys()]) if (store.deviceOf(thread) === device) store.settings.delete(thread)
    if (device === store.device()) refreshDraft()
    changed()
  }

  const fromEvent = (device: string, event: WireEvent) => {
    if (event.name === 'models.change') useCatalog(device, { ...event.args[0], sources: event.args[0].sources ?? [] })
    if (event.name === 'settings.change') {
      store.settings.set(...event.args)
      changed()
    }
  }

  ctx.on('wire.hello', hello => useCatalog(store.here(), fromHello(hello)))
  ctx.on('wire.event', event => fromEvent(store.here(), event))

  const infoOn = (device: string, id?: string) => catalogOf(device).models.find(model => model.id === id)

  const state = (thread = threads.current()?.id) => {
    if (!thread) return draftState
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
    draft: () => draft,
    prepare(patch) {
      draft = patch ? clean({ ...draft, ...patch }) : {}
      refreshDraft()
      changed()
    },
    hello: (device, hello) => useCatalog(device, fromHello(hello)),
    event: fromEvent,
    forget(device) {
      if (!catalogs.delete(device)) return
      changed()
    },
  }
}
