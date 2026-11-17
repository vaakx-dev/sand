import { accountPool } from '@sand/account-pool/contract'
import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { turns } from '@sand/turns-contract/contract'
import { type EffectiveSettings, type Level, modelSettingsChange, modelSource, type Selection, type SessionSettings, type SettingsPatch, type SettingsState } from './contract'
import type { Context } from 'drydock'
import { resolve } from './effective'
import type { Levels } from './levels'
import { clean, same, settingsOf, writeSettings } from './settings'

const frozen = ({ effort: _, ...settings }: EffectiveSettings, { model, effort, speed }: Selection): EffectiveSettings => ({
  ...settings,
  model,
  ...(effort && { effort }),
  speed,
})

const levelOf = (session?: Session): Level => (session?.kind === 'bot' ? 'bot' : 'main')

export const createChoices = (ctx: Context, levels: Levels) => {
  const pending = new Map<string, SessionSettings>()

  const resolved = (settings: SessionSettings, level: Level) => resolve(settings, levels.settings(level), ctx.get(llm))

  const running = (session: Session) => ctx.get(turns)?.current(session)?.selection

  const effective = (session?: Session) => {
    const settings = resolved(settingsOf(session), levelOf(session))
    const selection = session && running(session)
    return selection ? frozen(settings, selection) : settings
  }

  const own = (session: Session) => {
    const settings = settingsOf(session)
    const { model } = resolved(settings, levelOf(session))
    if (model && !settings.model) writeSettings(session, { ...settings, model })
  }

  const select = (session: Session): Selection | undefined => {
    own(session)
    const { model, effort, speed } = resolved(settingsOf(session), levelOf(session))
    return model ? { source: ctx.get(accountPool)?.source(session, model) ?? modelSource(model), model, ...(effort && { effort }), speed } : undefined
  }

  const change = (session: Session, patch: SettingsPatch) => {
    if (!Object.keys(patch).length) return
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
    return { current: effective(session), ...(next && { next: resolved(next, levelOf(session)) }) }
  }

  return { effective, resolved, select, change, settle, state }
}

export type Choices = ReturnType<typeof createChoices>
