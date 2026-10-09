import type { Effort } from '@sand/llm-accounts/contract'
import type { Command } from '@sand/server/contract'
import { modelOf } from '../effective'
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
    const efforts = (ctx.llm?.levels?.() ?? []).map(entry => entry.id as string)
    if (!level) {
      const { current, next } = choices.state(ctx.ui.session())
      const model = modelOf(ctx.llm, (next ?? current).model)
      if (!model?.efforts.length) return ctx.ui.notify(`${model?.label ?? 'This model'} has no effort setting.`)
      return effortSheet(tools, model)
    }
    if (level !== 'default' && !efforts.includes(level)) throw new Error(`Effort must be one of ${efforts.join(', ')} or default.`)
    await applyChoice(tools, { effort: level === 'default' ? null : (level as Effort) }, { asDefault, quiet })
  },
})
