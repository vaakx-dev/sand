import type { Session } from '@sand/sessions-sqlite/contract'
import type { SettingsPatch, SettingsState } from './contract'
import type { Context } from 'drydock'
import type { Defaults } from './defaults'
import { resolve } from './effective'
import { clean, same, settingsOf, writeSettings } from './settings'

export type Timing = 'now' | 'next'

export const createChoices = (ctx: Context, defaults: Defaults) => {
  const pending = new Map<string, ReturnType<typeof clean>>()

  const change = (session: Session, patch: SettingsPatch): Timing => {
    const current = settingsOf(session)
    if (!ctx.loop?.active(session)) {
      pending.delete(session.id)
      writeSettings(session, clean({ ...current, ...patch }))
      return 'now'
    }
    const next = clean({ ...(pending.get(session.id) ?? current), ...patch })
    if (same(next, current)) pending.delete(session.id)
    else pending.set(session.id, next)
    ctx.emit('modelSettings.change', session)
    return 'next'
  }

  const settle = (session: Session) => {
    const next = pending.get(session.id)
    if (!next) return
    pending.delete(session.id)
    writeSettings(session, next)
  }

  const state = (session?: Session): SettingsState => {
    const next = session && pending.get(session.id)
    return { current: resolve(settingsOf(session), defaults.get(), ctx.llm), ...(next && { next: resolve(next, defaults.get(), ctx.llm) }) }
  }

  return { change, settle, state }
}

export type Choices = ReturnType<typeof createChoices>
