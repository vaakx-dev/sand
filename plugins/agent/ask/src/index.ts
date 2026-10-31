import { llm } from '@sand/accounts/contract'
import { definePlugin } from 'drydock'
import { config } from './config'
import { ask } from './contract'
import { createJson } from './json'
import { createText } from './text'

export default definePlugin({
  name: 'ask',
  description: 'Short one-shot model calls for other plugins, as plain text or checked JSON',
  inject: { llm },
  config,
  apply(ctx, config) {
    const text = createText(ctx, config)
    ctx.provide(ask, { text, json: createJson(text) })
  },
})
