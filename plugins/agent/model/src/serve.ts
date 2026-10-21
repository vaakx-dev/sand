import { llm, llmModels } from '@sand/accounts/contract'
import { sessionEntry, type Session, type sessions } from '@sand/chats/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import {
  helloDefaults,
  helloLevels,
  helloModels,
  helloSources,
  modelsChange,
  modelSettingsChange,
  modelSettingsDefaults,
  settingsChange,
  settingsGet,
  settingsSave,
  settingsSet,
  type SettingsPatch,
} from './contract'
import type { Defaults } from './defaults'
import { canonical, resolve } from './effective'
import { knownPatch } from './settings'

const hellos = (ctx: Context, server: Server, defaults: Defaults) =>
  joinDisposers(
    server.hello(helloModels, () => ctx.get(llm)?.models?.()),
    server.hello(helloSources, () => ctx.get(llm)?.sources?.()),
    server.hello(helloLevels, () => ctx.get(llm)?.levels?.()),
    server.hello(helloDefaults, () => canonical(ctx.get(llm), defaults.get())),
  )

export const serveSettings = (ctx: Context<{ sessions: typeof sessions }>, server: Server, choices: Choices, defaults: Defaults) => {
  const shareModels = () => {
    const current = ctx.get(llm)
    server.broadcast(modelsChange, {
      models: current?.models?.() ?? [],
      sources: current?.sources?.() ?? [],
      levels: current?.levels?.() ?? [],
      defaults: canonical(current, defaults.get()),
    })
  }
  const shareSettings = (id: string) => {
    const session = ctx.sessions.open(id)
    if (session) server.broadcast(settingsChange, [id, choices.state(session)])
  }
  const saveDefaults = async (patch: SettingsPatch) => {
    await defaults.save(patch)
    ctx.emit(modelSettingsDefaults)
  }
  const saveChosen = async (session: Session) => {
    const { model, chosen } = choices.shown(session)
    const fallback = defaults.get()
    const speed = chosen.speed ?? fallback.speed
    await saveDefaults({ model: model ?? null, effort: chosen.effort ?? fallback.effort ?? null, speed: speed === 'fast' ? 'fast' : null })
    choices.change(session, { model: null, effort: null, speed: null })
  }
  return joinDisposers(
    hellos(ctx, server, defaults),
    server.handle(settingsGet, ({ session, settings }) => {
      const opened = session === undefined ? undefined : ctx.sessions.open(session)
      return opened ? choices.state(opened) : { current: resolve(settings ?? {}, defaults.get(), ctx.get(llm)) }
    }),
    server.handle(settingsSet, async ({ session, patch }) => {
      const known = knownPatch(patch)
      if (session === undefined) await saveDefaults(known)
      else choices.change(ctx.sessions.require(session), known)
    }),
    server.handle(settingsSave, ({ session }) => saveChosen(ctx.sessions.require(session))),
    ctx.on(modelSettingsChange, session => shareSettings(session.id)),
    ctx.on(modelSettingsDefaults, shareModels),
    ctx.on(llmModels, shareModels),
    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'settings') shareSettings(session.id)
    }),
    ctx.watch(llm, shareModels),
  )
}
