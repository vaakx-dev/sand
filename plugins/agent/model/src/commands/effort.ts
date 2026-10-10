import type { Command } from '@sand/server/contract'
import { asEffort, effortIds, modelOf } from '../effective'
import { applyChoice } from './apply'
import { parseArgs } from './args'
import type { Tools } from './context'
import { effortSheet } from './sheet'

export const effortCommand = (tools: Tools): Command => ({
  name: 'effort',
  description: 'Choose how hard the model thinks',
  args: '[level|default] [--default]',
  async run(text) {
    const { ctx, choices } = tools
    const { words, asDefault, quiet } = parseArgs(text)
    const [level] = words
    if (!level) {
      const model = modelOf(ctx.llm, choices.shown(ctx.ui.session()).model)
      if (!model?.efforts.length) return ctx.ui.notify(`${model?.label ?? 'This model'} has no effort setting.`)
      return effortSheet(tools, model)
    }
    const effort = level === 'default' ? null : asEffort(ctx.llm, level)
    if (effort === undefined) throw new Error(`Effort must be one of ${effortIds(ctx.llm).join(', ')} or default.`)
    await applyChoice(tools, { effort }, { asDefault, quiet })
  },
})
