import { style } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import type { MathRenderer } from '../contract'
import { mathCss } from './style'
import { typeset } from './typeset'

const renderer: MathRenderer = {
  inline: tex => typeset(tex, false),
  display: tex => typeset(tex, true),
}

export default definePlugin({
  name: 'math-view',
  description: 'Typesets LaTeX formulas with KaTeX for the markdown in the thread',
  apply(ctx) {
    style(ctx, mathCss)
    ctx.provide('math', renderer)
  },
})
