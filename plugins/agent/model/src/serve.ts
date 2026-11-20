import { llm, llmLimits, llmModels } from '@sand/accounts/contract'
import { sessionEntry, sessions, type Sessions } from '@sand/chats/contract'
import type { Actor } from '@sand/host-hub/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import {
  helloEfforts,
  helloModels,
  helloRoles,
  helloSources,
  modelsChange,
  modelSettingsChange,
  settingsChange,
  modelsList,
  settingsGet,
} from './contract'
import { canonical } from './effective'
import { modelRows } from './list'
import { picks } from './roles'

const shownPicks = (ctx: Context) => Object.fromEntries(Object.entries(picks(ctx.get(llm))).map(([role, pick]) => [role, canonical(ctx.get(llm), pick)]))

const hellos = (ctx: Context, server: Server) =>
  joinDisposers(
    server.hello(helloModels, () => ctx.get(llm)?.models?.()),
    server.hello(helloSources, () => ctx.get(llm)?.sources?.()),
    server.hello(helloEfforts, () => ctx.get(llm)?.levels?.()),
    server.hello(helloRoles, () => shownPicks(ctx)),
  )

const callerThread = (actor: Actor | undefined) => (actor?.owner === 'thread' ? actor.id : undefined)

const serveThreadSettings = (ctx: Context, server: Server, choices: Choices, threads: Sessions) => {
  const shareSettings = (id: string) => {
    const session = threads.open(id)
    if (session) server.broadcast(settingsChange, [id, choices.state(session)])
  }
  const currentModel = (id: string | undefined) => {
    const session = id === undefined ? undefined : threads.open(id)
    return session && choices.effective(session).model
  }
  return joinDisposers(
    server.handle(modelsList, ({ thread }, { actor }) => modelRows(ctx.get(llm), currentModel(thread ?? callerThread(actor)))),
    ctx.on(modelSettingsChange, session => shareSettings(session.id)),
    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'settings') shareSettings(session.id)
    }),
  )
}

export const serveSettings = (ctx: Context, server: Server, choices: Choices) => {
  const shareModels = () => {
    const current = ctx.get(llm)
    server.broadcast(modelsChange, {
      models: current?.models?.() ?? [],
      sources: current?.sources?.() ?? [],
      efforts: current?.levels?.() ?? [],
      roles: shownPicks(ctx),
    })
  }
  return joinDisposers(
    hellos(ctx, server),
    server.handle(settingsGet, ({ session, settings }) => {
      const opened = session === undefined ? undefined : ctx.get(sessions)?.open(session)
      return opened ? choices.state(opened) : { current: choices.resolved(settings ?? {}) }
    }),
    ctx.on(llmModels, shareModels),
    ctx.on(llmLimits, shareModels),
    ctx.watch(llm, shareModels),
    ctx.watch(sessions, found => found && serveThreadSettings(ctx, server, choices, found)),
  )
}
