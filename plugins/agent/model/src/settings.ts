import type { Session } from '@sand/sessions-sqlite/contract'
import type { SessionSettings, SettingsPatch } from './contract'

const keys = ['model', 'effort', 'speed'] as const

export const clean = (settings: SettingsPatch): SessionSettings =>
  Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined && value !== null))

export const settingsOf = (session?: Session): SessionSettings =>
  (session?.path().findLast(entry => entry.type === 'settings')?.data as SessionSettings | undefined) ?? {}

export const same = (a: SessionSettings, b: SessionSettings) => keys.every(key => a[key] === b[key])

export const writeSettings = (session: Session, next: SessionSettings) => {
  if (!same(settingsOf(session), next)) session.append('settings', next)
  return next
}

export const updateSettings = (session: Session, patch: SettingsPatch) => writeSettings(session, clean({ ...settingsOf(session), ...patch }))
