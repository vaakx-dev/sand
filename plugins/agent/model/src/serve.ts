import { llm, llmLimits, llmModels } from '@sand/accounts/contract'
import { sessionEntry, sessions, type Sessions } from '@sand/chats/contract'
import type { Actor, InputOf } from '@sand/host-hub/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import {
  helloEfforts,
  helloModels,
  helloPicks,
  helloSources,
  modelsChange,
  modelSettingsChange,
  settingsChange,
  modelsList,
  pickSet,
  settingsGet,
} from './contract'
import { modelRows } from './list'
import { matchSettings } from './match'
import type { UsePicks } from './picks'
import { clean } from './settings'

type PickChange = InputOf<typeof pickSet>

const hellos = (ctx: Context, server: Server, picks: UsePicks) =>
  joinDisposers(
    server.hello(helloModels, () => ctx.get(llm)?.models?.()),
    server.hello(helloSources, () => ctx.get(llm)?.sources?.()),
    server.hello(helloEfforts, () => ctx.get(llm)?.levels?.()),
    server.hello(helloPicks, () => picks.state()),
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

const savePick = (ctx: Context, picks: UsePicks, { use, model, effort, speed }: PickChange) => {
  if (model === null) return picks.save(use, undefined)
  const patch = matchSettings({ model, effort, speed }, ctx.get(llm))
  const kept = patch.model ? {} : picks.state().chosen[use]
  const next = clean({ ...kept, ...patch })
  if (!next.model) throw new Error('Choose a model first')
  return picks.save(use, next)
}

export const serveSettings = (ctx: Context, server: Server, choices: Choices, picks: UsePicks) => {
  const shareModels = () => {
    const current = ctx.get(llm)
    server.broadcast(modelsChange, {
      models: current?.models?.() ?? [],
      sources: current?.sources?.() ?? [],
      efforts: current?.levels?.() ?? [],
      picks: picks.state(),
    })
  }
  const changePick = async (change: PickChange) => {
    const saved = await savePick(ctx, picks, change)
    shareModels()
    return saved
  }
  return joinDisposers(
    hellos(ctx, server, picks),
    server.handle(settingsGet, ({ session, settings }) => {
      const opened = session === undefined ? undefined : ctx.get(sessions)?.open(session)
      return opened ? choices.state(opened) : { current: choices.resolved(settings ?? {}) }
    }),
    server.handle(pickSet, changePick),
    ctx.on(llmModels, shareModels),
    ctx.on(llmLimits, shareModels),
    ctx.watch(llm, shareModels),
    ctx.watch(sessions, found => found && serveThreadSettings(ctx, server, choices, found)),
  )
}
