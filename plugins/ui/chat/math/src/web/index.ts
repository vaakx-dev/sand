import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { math, type MathRenderer } from '../contract'
import { mathCss } from './style'
import { typeset } from './typeset'

const renderer: MathRenderer = {
  inline: tex => typeset(tex, false),
  display: tex => typeset(tex, true),
}

export default definePlugin({
  name: 'math-view',
  description: 'Typesets LaTeX formulas with KaTeX for the markdown in the chat',
  inject: { kit },
  apply(ctx) {
    ctx.kit.style(ctx, mathCss)
    ctx.provide(math, renderer)
  },
})
