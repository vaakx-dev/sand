import type { LLM } from '@sand/llm-accounts/contract'
import type { EffectiveSettings, SessionSettings } from './contract'

export const modelOf = (llm: LLM | undefined, id?: string) => {
  if (!id) return undefined
  return llm?.find?.(id) ?? llm?.models?.().find(info => info.id === id)
}

export const canonical = (llm: LLM | undefined, settings: SessionSettings): SessionSettings => {
  const found = modelOf(llm, settings.model)
  return found ? { ...settings, model: found.id } : settings
}

export const resolve = (chosen: SessionSettings, defaults: SessionSettings, llm?: LLM): EffectiveSettings => {
  const asked = chosen.model ?? defaults.model
  const info = modelOf(llm, asked)
  const model = info?.id ?? asked
  const efforts = info?.efforts ?? []
  const wanted = chosen.effort ?? defaults.effort
  const supportsEffort = efforts.length > 0
  const supportsFast = Boolean(info?.fast)
  const effort = supportsEffort ? (wanted && efforts.includes(wanted) ? wanted : info?.defaultEffort) : undefined
  const fast = (chosen.speed ?? defaults.speed) === 'fast'
  return {
    model,
    ...(effort && { effort }),
    speed: supportsFast && fast ? 'fast' : 'normal',
    supportsEffort,
    supportsFast,
    chosen,
    source: {
      model: chosen.model ? 'session' : 'default',
      ...(supportsEffort && { effort: chosen.effort ? 'session' : defaults.effort ? 'default' : 'model' }),
      speed: chosen.speed ? 'session' : defaults.speed ? 'default' : 'model',
    },
  }
}

export const levelLabel = (llm: LLM | undefined, effort?: string) => llm?.levels?.().find(level => level.id === effort)?.label ?? effort

export const describe = (settings: EffectiveSettings, llm?: LLM) =>
  [modelOf(llm, settings.model)?.label ?? settings.model, levelLabel(llm, settings.effort), settings.speed === 'fast' && 'Fast'].filter(Boolean).join(' · ')
