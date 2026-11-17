import { type LLM, llm, llmModels } from '@sand/accounts/contract'
import { sessionEntry, sessions, type Sessions } from '@sand/chats/contract'
import type { Actor, InputOf } from '@sand/host-hub/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import {
  helloEfforts,
  helloLevels,
  helloModels,
  helloSources,
  type LevelPicks,
  levelSet,
  levelsGet,
  modelsChange,
  modelSettingsChange,
  settingsChange,
  modelsList,
  settingsGet,
} from './contract'
import { canonical } from './effective'
import type { Levels } from './levels'
import { matchSettings } from './match'
import { modelRows } from './list'
import { clean } from './settings'

const shownPicks = (current: LLM | undefined, picks: LevelPicks): LevelPicks =>
  Object.fromEntries(Object.entries(picks).map(([level, pick]) => [level, canonical(current, pick)]))

const hellos = (ctx: Context, server: Server, levels: Levels) =>
  joinDisposers(
    server.hello(helloModels, () => ctx.get(llm)?.models?.()),
    server.hello(helloSources, () => ctx.get(llm)?.sources?.()),
    server.hello(helloEfforts, () => ctx.get(llm)?.levels?.()),
    server.hello(helloLevels, () => shownPicks(ctx.get(llm), levels.picks())),
  )

type LevelChange = InputOf<typeof levelSet>

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

const saveLevel = async (ctx: Context, levels: Levels, { level, model, effort, speed }: LevelChange) => {
  if (model === null) return levels.save(level, undefined)
  const patch = matchSettings({ model, effort, speed }, ctx.get(llm))
  const kept = patch.model ? {} : levels.settings(level)
  const next = clean({ ...kept, ...patch })
  if (!next.model) throw new Error(`Choose a model for the ${level} level first`)
  return levels.save(level, next)
}

export const serveSettings = (ctx: Context, server: Server, choices: Choices, levels: Levels) => {
  const shareModels = () => {
    const current = ctx.get(llm)
    server.broadcast(modelsChange, {
      models: current?.models?.() ?? [],
      sources: current?.sources?.() ?? [],
      efforts: current?.levels?.() ?? [],
      levels: shownPicks(current, levels.picks()),
    })
  }
  const changeLevel = async (change: LevelChange) => {
    const picks = await saveLevel(ctx, levels, change)
    shareModels()
    return shownPicks(ctx.get(llm), picks)
  }
  return joinDisposers(
    hellos(ctx, server, levels),
    server.handle(settingsGet, ({ session, settings }) => {
      const opened = session === undefined ? undefined : ctx.get(sessions)?.open(session)
      return opened ? choices.state(opened) : { current: choices.resolved(settings ?? {}, 'main') }
    }),
    server.handle(levelsGet, () => shownPicks(ctx.get(llm), levels.picks())),
    server.handle(levelSet, changeLevel),
    ctx.on(llmModels, shareModels),
    ctx.watch(llm, shareModels),
    ctx.watch(sessions, found => found && serveThreadSettings(ctx, server, choices, found)),
  )
}
