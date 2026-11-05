import { llm, llmModels } from '@sand/accounts/contract'
import { sessions, type Session } from '@sand/chats/contract'
import { cli } from '@sand/config/contract'
import { createHandlers, type Request } from '@sand/host-hub/contract'
import { modelSettings } from '@sand/model/contract'
import { projectFiles } from '@sand/project/contract'
import { replayRequests, type Source } from '@sand/replay/contract'
import { server } from '@sand/server/contract'
import { type ToolContext, tools } from '@sand/tools/contract'
import { turns } from '@sand/turns-contract/contract'
import { type Context, createApp, scopeError, type ContextCore, type Service } from 'drydock'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { z } from 'zod'

const builtins = resolve(import.meta.dir, '..', '..', '..', 'plugins')

const plugins = ['core/paths', 'core/media', 'core/chats', 'core/accounts', 'agent/tools', 'agent/prompt', 'agent/compaction', 'agent/provider-threads', 'agent/turns', 'agent/model']

const runtimeEntry = async (folder: string) => {
  const dir = join(builtins, folder)
  const { sand } = await Bun.file(join(dir, 'package.json')).json()
  return resolve(dir, sand.runtime)
}

const need = <T>(app: ContextCore, token: Service<T>) => {
  const found = app.get(token)
  if (!found) throw new Error(`${token.id} did not start`)
  return found
}

const modelsReady = (app: ContextCore, ids: string[]) =>
  new Promise<void>(resolve => {
    const check = () => {
      if (!ids.every(id => app.get(llm)?.find?.(id))) return
      stop()
      resolve()
    }
    const stop = app.on(llmModels, check)
    check()
  })

const signedIn = (sources: Source[]) =>
  Object.fromEntries(sources.flatMap(source => (source.api ? [[source.id, { type: 'oauth', access: 'replay', refresh: 'replay', expires: 8e15 }]] : [])))

const boot = async (app: Context, home: string, sources: Source[]) => {
  await Bun.write(join(home, 'auth.json'), JSON.stringify(signedIn(sources)))
  const errors: unknown[] = []
  app.on(scopeError, (_, error) => void errors.push(error))
  app.provide(cli, { place: 'runtime', home, cwd: home, builtins, safe: true, args: [], exit() {} })
  app.provide(projectFiles, { copies: () => [], ofFolder: () => null })
  const wire = createHandlers()
  app.provide(server, { handle: wire.handle, broadcast() {}, hello: () => () => {}, route: () => () => {}, pages: () => 0 })
  for (const plugin of plugins) app.load(await runtimeEntry(plugin), {})
  app.load(await runtimeEntry('core/replay'), { sources })
  await app.settled()
  if (errors.length) throw errors[0]
  await modelsReady(app, sources.flatMap(source => source.models.map(name => `${source.id}/${name}`)))
  return wire
}

export const startSand = async (sources: Source[], shared?: string) => {
  const home = shared ?? mkdtempSync(join(tmpdir(), 'sand-test-'))
  const app = createApp()
  const stop = async () => {
    await app.dispose()
    if (!shared) rmSync(home, { recursive: true, force: true })
  }
  const wire = await boot(app, home, sources).catch(async (error: unknown) => {
    await stop()
    throw error
  })

  return {
    app,
    home,
    sessions: need(app, sessions),
    turns: need(app, turns),
    chat(model: string): Session {
      const session = need(app, sessions).thread(home)
      need(app, modelSettings).update(session, { model })
      return session
    },
    requests: (source: string) => need(app, replayRequests).bodies(source),
    ask: <I, O>(request: Request<I, O>, input: I) => wire.answer(request.id, input, { device: 'page', kind: 'browser' }),
    tool(name: string, run: (input: Record<string, unknown>, context: ToolContext) => string | Promise<string>) {
      need(app, tools).register({ name, description: name, input: z.record(z.string(), z.unknown()), run })
    },
    stop,
  }
}

export type Sand = Awaited<ReturnType<typeof startSand>>
