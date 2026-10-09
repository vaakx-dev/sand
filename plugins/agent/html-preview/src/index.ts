import { definePlugin } from 'drydock'
import { z } from 'zod'
import { findBrowser } from './browser'
import { previewTool } from './tool'

export default definePlugin({
  name: 'html-preview',
  description: 'html_preview tool: renders a page in headless Chromium so the agent can check it before html_render',
  inject: ['tools', 'htmlPages'],
  config: z.object({
    browser: z.string().optional(),
    timeout_ms: z.number().int().positive().default(30_000),
  }),
  apply(ctx, config) {
    const browser = findBrowser(config.browser)
    if (!browser && config.browser) throw new Error(`No browser at ${config.browser}`)
    if (!browser) return
    ctx.effect(() => ctx.tools.register(previewTool(browser, ctx.htmlPages, config.timeout_ms)))
  },
})
