import { llm } from '@sand/accounts/contract'
import { definePlugin } from 'drydock'
import { ask } from './contract'
import { createJson } from './json'
import { createText } from './text'

export default definePlugin({
  name: 'ask',
  description: 'Short one-shot model calls for other plugins, as plain text or checked JSON',
  inject: { llm },
  apply(ctx) {
    const text = createText(ctx)
    ctx.provide(ask, { text, json: createJson(text) })
  },
})
