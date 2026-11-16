import { type AppPlace, llmPlans } from '@sand/accounts/contract'
import { paths } from '@sand/paths/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { replayApi } from './api'
import { replayApp } from './app'
import { replayRequests, type Script, sourceSchema } from './contract'

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
    const apps = new Map<string, ReturnType<typeof replayApp>>()
    const added = (script: Script) => (place: AppPlace) => {
      const made = replayApp(sources.find(source => source.id === place.id && source.of === script.id) ?? { ...script, id: place.id }, folder)
      apps.set(place.id, made)
      return made.plan
    }
    for (const source of sources) if (!source.api && !source.of) apps.set(source.id, replayApp(source, folder, added(source)))
    const own = [...apps.values()]
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
    ctx.watch(llmPlans, plans => plans && joinDisposers(...[...apis.values(), ...own].map(({ plan }) => plans.register(plan))))
  },
})
