import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { loop } from '@sand/loop/contract'
import { modelSettingsChange, type SessionSettings, type SettingsPatch, type SettingsState } from './contract'
import type { Context } from 'drydock'
import type { Defaults } from './defaults'
import { resolve } from './effective'
import { clean, same, settingsOf, writeSettings } from './settings'

export type Timing = 'now' | 'next'

export const createChoices = (ctx: Context, defaults: Defaults) => {
  const pending = new Map<string, SessionSettings>()

  const change = (session: Session, patch: SettingsPatch): Timing => {
    const current = settingsOf(session)
    if (!ctx.get(loop)?.active(session)) {
      pending.delete(session.id)
      writeSettings(session, clean({ ...current, ...patch }))
      return 'now'
    }
    const next = clean({ ...(pending.get(session.id) ?? current), ...patch })
    if (same(next, current)) pending.delete(session.id)
    else pending.set(session.id, next)
    ctx.emit(modelSettingsChange, session)
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
    const current = ctx.get(llm)
    return { current: resolve(settingsOf(session), defaults.get(), current), ...(next && { next: resolve(next, defaults.get(), current) }) }
  }

  const shown = (session?: Session) => {
    const { current, next } = state(session)
    return next ?? current
  }

  return { change, settle, state, shown }
}

export type Choices = ReturnType<typeof createChoices>
