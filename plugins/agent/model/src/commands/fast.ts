import type { Command } from '@sand/protocol'
import { applyChoice } from './apply'
import { parseArgs } from './args'
import type { Tools } from './context'

const values: Record<string, 'fast' | 'normal' | null> = { on: 'fast', off: 'normal', default: null }

export const fastCommand = (tools: Tools): Command => ({
  name: 'fast',
  description: 'Fast mode',
  args: '[on|off|default] [--default]',
  async run(text) {
    const { ctx, choices } = tools
    const { words, asDefault, quiet } = parseArgs(text)
    const [word] = words
    if (word && !(word in values)) throw new Error('Use /fast on, /fast off or /fast default.')
    const { current, next } = choices.state(ctx.ui.session())
    const speed = word ? values[word]! : (next ?? current).speed === 'fast' ? 'normal' : 'fast'
    await applyChoice(tools, { speed }, { asDefault, quiet })
  },
})
