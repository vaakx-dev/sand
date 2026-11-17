import type { SandConfig } from '@sand/config/contract'
import { type Level, levelSettings, type LevelPicks, type SessionSettings } from './contract'

const TABLE = ['plugins', 'model', 'levels']

export interface Levels {
  picks(): LevelPicks
  settings(level: Level): SessionSettings
  save(level: Level, pick: SessionSettings | undefined): Promise<LevelPicks>
}

export const createLevels = (config: SandConfig, saved: LevelPicks, firstModel: () => string | undefined): Levels => {
  let own = saved
  const picks = (): LevelPicks => {
    const offered = own.main?.model ?? firstModel()
    return offered ? { ...own, main: { ...own.main, model: offered } } : own
  }
  return {
    picks,
    settings: level => levelSettings(picks(), level),
    async save(level, pick) {
      const { model, effort, speed } = pick ?? {}
      await config.set([...TABLE, level], { model, effort, speed })
      const { [level]: _, ...others } = own
      own = pick ? { ...others, [level]: pick } : others
      return picks()
    },
  }
}
