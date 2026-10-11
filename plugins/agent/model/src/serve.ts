import { joinDisposers } from '@sand/kit'
import type { Server } from '@sand/server/contract'
import type { SettingsState } from './contract'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import type { Defaults } from './defaults'
import { canonical, resolve } from './effective'

export const serveSettings = (ctx: Context<'sessions'>, server: Server, choices: Choices, defaults: Defaults) => {
  const shareModels = () =>
    server.broadcast('models.change', [
      {
        models: ctx.llm?.models?.() ?? [],
        sources: ctx.llm?.sources?.() ?? [],
        levels: ctx.llm?.levels?.() ?? [],
        defaults: canonical(ctx.llm, defaults.get()),
      },
    ])
  const shareSettings = (id: string) => {
    const session = ctx.sessions.open(id)
    if (session) server.broadcast('settings.change', [id, choices.state(session)])
  }
  return joinDisposers(
    server.handle('settings.get', ({ session, settings }): SettingsState => {
      const opened = typeof session === 'string' ? ctx.sessions.open(session) : undefined
      return opened ? choices.state(opened) : { current: resolve(settings ?? {}, defaults.get(), ctx.llm) }
    }),
    ctx.on('modelSettings.change', session => shareSettings(session.id)),
    ctx.on('modelSettings.defaults', shareModels),
    ctx.on('llm.models', shareModels),
    ctx.on('session.entry', (session, entry) => {
      if (entry.type === 'settings') shareSettings(session.id)
    }),
    ctx.watch('llm', shareModels),
  )
}
