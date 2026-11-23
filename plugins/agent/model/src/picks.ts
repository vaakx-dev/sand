import type { LLM } from '@sand/accounts/contract'
import type { SandConfig } from '@sand/config/contract'
import { type ModelPicks, type Picks, type SessionSettings, type Use, uses } from './contract'
import { canonical } from './effective'

const TABLE = ['plugins', 'model']

const withModels = (saved: Picks): Picks => Object.fromEntries(Object.entries(saved).filter(([, pick]) => pick.model))

const firstModel = (llm: LLM | undefined): SessionSettings => {
  const model = llm?.models?.().find(info => !info.hidden)?.id
  return model ? { model } : {}
}

export const createPicks = (config: SandConfig, saved: Picks, llm: () => LLM | undefined) => {
  let chosen = withModels(saved)

  const pick = (use: Use) => canonical(llm(), chosen[use] ?? chosen.default ?? firstModel(llm()))

  const state = (): ModelPicks => ({ shown: Object.fromEntries(uses.map(use => [use, pick(use)])), chosen })

  const save = async (use: Use, settings: SessionSettings | undefined) => {
    const { model, effort, speed } = settings ?? {}
    await config.set([...TABLE, use], { model, effort, speed })
    const { [use]: _, ...others } = chosen
    chosen = settings ? { ...others, [use]: settings } : others
    return state()
  }

  return { pick, state, save }
}

export type UsePicks = ReturnType<typeof createPicks>
