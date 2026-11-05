import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { turns } from '@sand/turns-contract/contract'
import { modelSettingsChange, modelSource, type EffectiveSettings, type Selection, type SessionSettings, type SettingsPatch, type SettingsState } from './contract'
import type { Context } from 'drydock'
import type { Defaults } from './defaults'
import { resolve } from './effective'
import { clean, same, settingsOf, writeSettings } from './settings'

const frozen = ({ effort: _, ...settings }: EffectiveSettings, { model, effort, speed }: Selection): EffectiveSettings => ({
  ...settings,
  model,
  ...(effort && { effort }),
  speed,
})

export const createChoices = (ctx: Context, defaults: Defaults) => {
  const pending = new Map<string, SessionSettings>()

  const resolved = (settings: SessionSettings) => resolve(settings, defaults.get(), ctx.get(llm))

  const running = (session: Session) => ctx.get(turns)?.current(session)?.selection

  const effective = (session?: Session) => {
    const settings = resolved(settingsOf(session))
    const selection = session && running(session)
    return selection ? frozen(settings, selection) : settings
  }

  const own = (session: Session) => {
    const settings = settingsOf(session)
    const { model } = resolved(settings)
    if (model && !settings.model) writeSettings(session, { ...settings, model })
  }

  const select = (session: Session): Selection | undefined => {
    own(session)
    const { model, effort, speed } = resolved(settingsOf(session))
    return model ? { source: modelSource(model), model, ...(effort && { effort }), speed } : undefined
  }

  const change = (session: Session, patch: SettingsPatch) => {
    const current = settingsOf(session)
    if (!running(session)) {
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
    const next = pending.get(session.id)
    if (!next) return
    pending.delete(session.id)
    writeSettings(session, next)
  }

  const state = (session?: Session): SettingsState => {
    const next = session && pending.get(session.id)
    return { current: effective(session), ...(next && { next: resolved(next) }) }
  }

  return { effective, resolved, select, change, settle, state }
}

export type Choices = ReturnType<typeof createChoices>
