import { llmPlans } from '@sand/accounts/contract'
import { paths } from '@sand/paths/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { replayApi } from './api'
import { replayApp } from './app'
import { replayRequests, sourceSchema } from './contract'

export default definePlugin({
  name: 'replay',
  description: 'Adds model sources that play scripted replies, tool calls and errors, for tests and sandboxes',
  inject: { paths },
  config: z.object({ sources: z.array(sourceSchema).default([]) }).default({ sources: [] }),
  apply(ctx, { sources }) {
    let base = ''
    const apis = new Map(sources.flatMap(source => (source.api ? [[source.id, replayApi(source, () => base)] as const] : [])))
    const folder = join(ctx.paths.home, 'replay')
    mkdirSync(folder, { recursive: true })
    const apps = new Map(sources.flatMap(source => (source.api ? [] : [[source.id, replayApp(source, folder)] as const])))
    ctx.effect(() => {
      if (!apis.size) return undefined
      const server = Bun.serve({
        hostname: '127.0.0.1',
        port: 0,
        fetch: request => apis.get(new URL(request.url).pathname.slice(1))?.answer(request) ?? new Response('Unknown source', { status: 404 }),
      })
      base = server.url.origin
      return () => void server.stop(true)
    })
    ctx.provide(replayRequests, { bodies: source => apis.get(source)?.bodies ?? [], native: source => apps.get(source)?.calls ?? [] })
    ctx.watch(llmPlans, plans => plans && joinDisposers(...[...apis.values(), ...apps.values()].map(({ plan }) => plans.register(plan))))
  },
})
