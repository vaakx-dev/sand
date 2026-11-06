import { llm, llmModels } from '@sand/accounts/contract'
import { sessionEntry, sessions, type Sessions } from '@sand/chats/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import {
  defaultsSet,
  helloDefaults,
  helloLevels,
  helloModels,
  helloSources,
  modelsChange,
  modelSettingsChange,
  modelSettingsDefaults,
  settingsChange,
  settingsGet,
  settingsSet,
  type SettingsPatch,
} from './contract'
import type { Defaults } from './defaults'
import { canonical } from './effective'
import { knownPatch } from './settings'

const hellos = (ctx: Context, server: Server, defaults: Defaults) =>
  joinDisposers(
    server.hello(helloModels, () => ctx.get(llm)?.models?.()),
    server.hello(helloSources, () => ctx.get(llm)?.sources?.()),
    server.hello(helloLevels, () => ctx.get(llm)?.levels?.()),
    server.hello(helloDefaults, () => canonical(ctx.get(llm), defaults.get())),
  )

const serveThreadSettings = (ctx: Context, server: Server, choices: Choices, threads: Sessions) => {
  const shareSettings = (id: string) => {
    const session = threads.open(id)
    if (session) server.broadcast(settingsChange, [id, choices.state(session)])
  }
  return joinDisposers(
    server.handle(settingsSet, ({ session, patch }) => choices.change(threads.require(session), knownPatch(patch))),
    ctx.on(modelSettingsChange, session => shareSettings(session.id)),
    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'settings') shareSettings(session.id)
    }),
  )
}

export const serveSettings = (ctx: Context, server: Server, choices: Choices, defaults: Defaults) => {
  const shareModels = () => {
    const current = ctx.get(llm)
    server.broadcast(modelsChange, {
      models: current?.models?.() ?? [],
      sources: current?.sources?.() ?? [],
      levels: current?.levels?.() ?? [],
      defaults: canonical(current, defaults.get()),
    })
  }
  const saveDefaults = async (patch: SettingsPatch) => {
    await defaults.save(patch)
    ctx.emit(modelSettingsDefaults)
  }
  return joinDisposers(
    hellos(ctx, server, defaults),
    server.handle(settingsGet, ({ session, settings }) => {
      const opened = session === undefined ? undefined : ctx.get(sessions)?.open(session)
      return opened ? choices.state(opened) : { current: choices.resolved(settings ?? {}) }
    }),
    server.handle(defaultsSet, ({ patch }) => saveDefaults(knownPatch(patch))),
    ctx.on(modelSettingsDefaults, shareModels),
    ctx.on(llmModels, shareModels),
    ctx.watch(llm, shareModels),
    ctx.watch(sessions, found => found && serveThreadSettings(ctx, server, choices, found)),
  )
}
