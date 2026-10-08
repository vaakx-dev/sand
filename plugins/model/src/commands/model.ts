import type { Command, Effort, SettingsPatch } from '@sand/protocol'
import { matchModel } from '@sand/kit'
import { applyChoice, saveChoices } from './apply'
import { parseArgs } from './args'
import type { Tools } from './context'
import { modelSheet } from './sheet'

const extras = (tools: Tools, words: string[]): SettingsPatch => {
  const efforts = (tools.ctx.llm?.levels?.() ?? []).map(level => level.id as string)
  const patch: SettingsPatch = {}
  for (const word of words) {
    if (efforts.includes(word)) patch.effort = word as Effort
    else if (word === 'fast' || word === 'normal') patch.speed = word
    else throw new Error(`"${word}" is not an effort level or a speed. Use ${efforts.join(', ')}, fast or normal.`)
  }
  return patch
}

export const modelCommand = (tools: Tools): Command => ({
  name: 'model',
  description: 'Choose the model for this thread',
  args: '[name|default|reset|save] [--default]',
  async run(text) {
    const { words, asDefault, quiet } = parseArgs(text)
    const [first, ...rest] = words
    if (!first) return modelSheet(tools)
    if (first === 'reset') return applyChoice(tools, { model: null, effort: null, speed: null }, { quiet })
    if (first === 'save') return saveChoices(tools, quiet)
    if (first === 'default') return applyChoice(tools, { model: null }, { quiet })
    const model = matchModel(first, tools.ctx.llm?.models?.() ?? [])
    await applyChoice(tools, { model, ...extras(tools, rest) }, { asDefault, quiet })
  },
})
