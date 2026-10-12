import type { Command } from '@sand/server/contract'
import type { SettingsPatch } from '../contract'
import { matchModel } from '@sand/kit'
import { asEffort, effortIds } from '../effective'
import { applyChoice, saveChoices } from './apply'
import { parseArgs } from './args'
import type { Tools } from './context'
import { modelSheet } from './sheet'

const extras = ({ ctx }: Tools, words: string[]): SettingsPatch => {
  const patch: SettingsPatch = {}
  for (const word of words) {
    const effort = asEffort(ctx.llm, word)
    if (effort) patch.effort = effort
    else if (word === 'fast' || word === 'normal') patch.speed = word
    else throw new Error(`"${word}" is not an effort level or a speed. Use ${effortIds(ctx.llm).join(', ')}, fast or normal.`)
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
    const { llm } = tools.ctx
    const model = matchModel(first, llm?.models?.() ?? [], llm?.find)
    await applyChoice(tools, { model, ...extras(tools, rest) }, { asDefault, quiet })
  },
})
