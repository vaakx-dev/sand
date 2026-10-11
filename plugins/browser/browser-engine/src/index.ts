import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/kit'
import { definePlugin, type Context } from 'drydock'
import { z } from 'zod'
import { findBrowser } from './chrome'
import type { Browser } from './contract'
import { createBrowser } from './registry'
import { framesPath, framesRoute } from './serve/frames'
import { serveRequests } from './serve/requests'

const serve = (ctx: Context, server: Server, browser: Browser) =>
  joinDisposers(
    serveRequests(server, browser),
    server.route(framesPath, framesRoute(browser)),
    ctx.on('browser.change', state => server.broadcast('browser.change', [state])),
    ctx.on('browser.close', thread => server.broadcast('browser.close', [thread])),
  )

export default definePlugin({
  name: 'browser-engine',
  description: 'browser service: a headless Chrome tab per thread that the agent and the browser panel share',
  uses: { server: 'the browser panel cannot show or drive tabs; agent tools still work' },
  config: z.object({
    browser: z.string().optional(),
    idle_minutes: z.number().positive().default(30),
  }),
  apply(ctx, config) {
    const executable = findBrowser(config.browser)
    if (!executable && config.browser) throw new Error(`No browser at ${config.browser}`)
    if (!executable) return
    const { browser, shutdown } = createBrowser(executable, config.idle_minutes * 60_000, {
      changed: state => ctx.emit('browser.change', state),
      closed: thread => ctx.emit('browser.close', thread),
    })
    ctx.provide('browser', browser)
    ctx.effect(() => () => void shutdown())
    ctx.watch('server', server => (server ? serve(ctx, server, browser) : undefined))
  },
})
