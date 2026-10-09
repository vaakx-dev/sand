import type { Server } from '@sand/server/contract'
import type { ModelsUpdate, SessionSettings, SettingsState } from './contract'
import type { Context } from 'drydock'
import type { Choices } from './choices'
import type { Defaults } from './defaults'
import { resolve } from './effective'

export const serveSettings = (ctx: Context<'sessions'>, server: Server, choices: Choices, defaults: Defaults) => {
  const update = (): ModelsUpdate => ({ models: ctx.llm?.models?.() ?? [], levels: ctx.llm?.levels?.() ?? [], defaults: defaults.get() })
  const share = (id: string) => {
    const session = ctx.sessions.open(id)
    if (session) server.broadcast('settings.change', [id, choices.state(session)])
  }
  const disposers = [
    server.handle('settings.get', ({ session, settings }): SettingsState => {
      const opened = typeof session === 'string' ? ctx.sessions.open(session) : undefined
      return opened ? choices.state(opened) : { current: resolve((settings ?? {}) as SessionSettings, defaults.get(), ctx.llm) }
    }),
    ctx.on('modelSettings.change', session => share(session.id)),
    ctx.on('modelSettings.defaults', () => server.broadcast('models.change', [update()])),
    ctx.on('llm.models', () => server.broadcast('models.change', [update()])),
    ctx.on('session.entry', (session, entry) => {
      if (entry.type === 'settings') share(session.id)
    }),
    ctx.watch('llm', () => server.broadcast('models.change', [update()])),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
