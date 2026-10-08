import type { Limits } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { body } from './body'
import { config } from './config'
import { parseLimits } from './limits'
import { levels, modelInfo } from './models'
import { priceOf } from './prices'
import { read } from './reader'
import { send } from './send'
import { events } from './sse'

const fastBeta = 'fast-mode-2026-02-01'

export default definePlugin({
  name: 'llm-anthropic',
  config,
  apply(ctx, config) {
    const key = config.api_key ?? process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('No API key: set api_key in [provider] or ANTHROPIC_API_KEY')
    const url = `${config.base_url.replace(/\/+$/, '')}/v1/messages`
    const headers = {
      'content-type': 'application/json',
      'accept-encoding': 'identity',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }
    let limits = ctx.hot.data.limits as Limits | undefined
    const init = (payload: Record<string, unknown>) => ({
      method: 'POST',
      headers: payload.speed === 'fast' ? { ...headers, 'anthropic-beta': fastBeta } : headers,
      body: JSON.stringify(payload),
    })
    const slower = ({ speed: _, ...payload }: Record<string, unknown>) => () => {
      const note = 'Fast mode is rate limited right now, so this reply runs at normal speed.'
      if (ctx.ui) ctx.ui.notify(note)
      else console.error(note)
      return init(payload)
    }

    const inspect = (response: Response) => {
      const parsed = parseLimits(response.headers)
      if (!parsed) return
      limits = ctx.hot.data.limits = parsed
      ctx.emit('llm.limits', parsed)
    }

    ctx.provide('llm', {
      models: () => modelInfo(config.models),
      levels: () => levels,
      async *stream(request, signal) {
        const payload = body(request, config)
        const limited = 'speed' in payload ? slower(payload) : undefined
        const response = await send(url, init(payload), { retries: config.max_retries, signal, inspect, limited })
        if (!response.body) throw new Error('Empty response body')
        yield* read(events(response.body))
      },
      limits: () => limits,
      price: priceOf,
      async refreshLimits() {
        const probe = { model: config.models[0]!, max_tokens: 1, messages: [{ role: 'user', content: '.' }] }
        const response = await send(url, init(probe), { retries: config.max_retries, inspect })
        await response.body?.cancel()
        return limits
      },
    })
  },
})
