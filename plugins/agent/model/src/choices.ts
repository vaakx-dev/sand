import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { modelSettingsChange, type EffectiveSettings, type SessionSettings, type SettingsPatch, type SettingsState } from './contract'
import type { Context } from 'drydock'
import type { Defaults } from './defaults'
import { resolve } from './effective'
import { clean, same, settingsOf, writeSettings } from './settings'

export const createChoices = (ctx: Context, defaults: Defaults) => {
  const turns = new Map<string, EffectiveSettings>()
  const pending = new Map<string, SessionSettings>()

  const resolved = (settings: SessionSettings) => resolve(settings, defaults.get(), ctx.get(llm))

  const effective = (session?: Session) => (session && turns.get(session.id)) ?? resolved(settingsOf(session))

  const own = (session: Session) => {
    const settings = settingsOf(session)
    const { model } = resolved(settings)
    if (model && !settings.model) writeSettings(session, { ...settings, model })
  }

  const begin = (session: Session) => {
    own(session)
    turns.set(session.id, resolved(settingsOf(session)))
  }

  const change = (session: Session, patch: SettingsPatch) => {
    const current = settingsOf(session)
    if (!turns.has(session.id)) {
      pending.delete(session.id)
      writeSettings(session, clean({ ...current, ...patch }))
      return
    }
    const next = clean({ ...(pending.get(session.id) ?? current), ...patch })
    if (same(next, current)) pending.delete(session.id)
    else pending.set(session.id, next)
    ctx.emit(modelSettingsChange, session)
  }

  const settle = (session: Session) => {
    turns.delete(session.id)
    const next = pending.get(session.id)
    if (!next) return
    pending.delete(session.id)
    writeSettings(session, next)
  }

  const state = (session?: Session): SettingsState => {
    const next = session && pending.get(session.id)
    return { current: effective(session), ...(next && { next: resolved(next) }) }
  }

  return { effective, resolved, begin, change, settle, state }
}

export type Choices = ReturnType<typeof createChoices>
