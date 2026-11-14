import { math as mathService } from '@sand/math/contract'
import { kit } from '@sand/ui-kit/contract'
import { definePlugin } from 'drydock'
import { highlight } from './code/highlight'
import { codeRenderers } from './code/renderers'
import { markdown, markdownCode, markdownLinks } from './contract'
import { markdownInline, markdownNodes } from './render'
import { linkSchemes } from './schemes'
import { settleMarkdown } from './settle'

export default definePlugin({
  name: 'markdown',
  description: 'Turns markdown and code into styled elements for the chat',
  inject: { kit },
  apply(ctx) {
    const schemes = linkSchemes()
    const code = codeRenderers()
    ctx.provide(markdownLinks, schemes)
    ctx.provide(markdownCode, code)
    ctx.watch(mathService, math =>
      code.follow(() => {
        const renderers = { kit: ctx.kit, math, scheme: schemes.find, code: code.find }
        return ctx.provide(markdown, { nodes: markdownNodes(renderers), settle: settleMarkdown(renderers), inline: markdownInline(renderers), highlight })
      }),
    )
  },
})
