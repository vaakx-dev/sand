import { llm, llmModels } from '@sand/accounts/contract'
import { sessions, type Session } from '@sand/chats/contract'
import { cli, pluginProblems, sandConfig } from '@sand/config/contract'
import { type Caller, createHandlers, type Request } from '@sand/host-hub/contract'
import { hostChannel, runtime } from '@sand/host-runtimes/contract'
import { media } from '@sand/media/contract'
import { modelSettings } from '@sand/model/contract'
import { type LocalCopy, projectFiles } from '@sand/project/contract'
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

const plugins = ['core/paths', 'core/media', 'core/ledger', 'core/chats', 'core/accounts', 'agent/tools', 'agent/prompt', 'agent/compaction', 'agent/provider-threads', 'agent/engine', 'agent/turns', 'agent/model', 'agent/orchestrator']

const liveSources = ['core/claude-code', 'core/codex']

const readyMs = 60_000

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
  new Promise<void>((resolve, reject) => {
    const missing = () => ids.filter(id => !app.get(llm)?.find?.(id))
    const timer = setTimeout(() => {
      stop()
      reject(new Error(`sand never offered ${missing().join(', ')}; sign in to their accounts in your sand`))
    }, readyMs)
    const check = () => {
      if (missing().length) return
      clearTimeout(timer)
      stop()
      resolve()
    }
    const stop = app.on(llmModels, check)
    check()
  })

interface Models {
  ids: string[]
  replay?: Source[]
}

const signedIn = (sources: Source[]) =>
  Object.fromEntries(sources.flatMap(source => (source.api ? [[source.id, { type: 'oauth', access: 'replay', refresh: 'replay', expires: 8e15 }]] : [])))

const tomlValue = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`
  if (typeof value !== 'object' || value === null) return JSON.stringify(value)
  const fields = Object.entries(value).filter(([, field]) => field !== undefined)
  return `{ ${fields.map(([key, field]) => `${JSON.stringify(key)} = ${tomlValue(field)}`).join(', ')} }`
}

const settings = (sources: Source[], config: string) =>
  `[plugins.server]
enabled = false

[plugins.replay]
sources = ${tomlValue(sources)}

${config}
`

const hostStubs = (app: Context) => {
  app.provide(runtime, { id: 'test', access: () => 'denied', caller: () => undefined, listening() {}, swap() {}, owns: () => true })
  app.provide(hostChannel, { call: () => Promise.reject(new Error('No host in tests')), on: () => () => {} })
}

const loadPlugins = async (app: Context, { replay }: Models, extra: string[]) => {
  const entries = await Promise.all([...plugins, ...(replay ? [] : liveSources), ...extra].map(runtimeEntry))
  for (const entry of entries) app.load(entry, {})
  if (replay) app.load(await runtimeEntry('core/replay'), { sources: replay })
}

const loadConfig = async (app: Context, home: string, sources: Source[], config: string) => {
  await Bun.write(join(home, 'sand.toml'), settings(sources, config))
  hostStubs(app)
  app.load(join(builtins, 'core', 'config', 'src', 'index.ts'))
}

const copiesStub = (projects: LocalCopy[]) => ({
  copies: () => projects,
  ofFolder: (folder: string) => projects.find(copy => resolve(folder).startsWith(resolve(copy.path)))?.project ?? null,
})

const boot = async (app: Context, home: string, models: Models, { plugins: extra = [], projects = [], sections = {}, config }: SandOptions) => {
  if (models.replay) await Bun.write(join(home, 'auth.json'), JSON.stringify(signedIn(models.replay)))
  const errors: unknown[] = []
  app.on(scopeError, (_, error) => void errors.push(error))
  app.provide(cli, { place: 'runtime', home, cwd: home, builtins, safe: config === undefined, args: [], exit() {} })
  if (config === undefined) {
    app.provide(projectFiles, copiesStub(projects))
    app.provide(sandConfig, { path: join(home, 'sand.toml'), section: name => sections[name] })
  }
  const wire = createHandlers()
  app.provide(server, { handle: wire.handle, broadcast() {}, hello: () => () => {}, route: () => () => {}, pages: () => 0, ask: wire.ask })
  await (config === undefined ? loadPlugins(app, models, extra) : loadConfig(app, home, models.replay ?? [], config))
  await app.settled()
  if (errors.length && config === undefined) throw errors[0]
  await modelsReady(app, models.ids)
  return wire
}

export interface SandOptions {
  home?: string
  plugins?: string[]
  projects?: LocalCopy[]
  sections?: Record<string, unknown>
  config?: string
}

const start = async (models: Models, options: SandOptions) => {
  const shared = options.home
  const home = shared ?? mkdtempSync(join(tmpdir(), 'sand-test-'))
  const app = createApp()
  const stop = async () => {
    await app.dispose()
    if (!shared) rmSync(home, { recursive: true, force: true })
  }
  const wire = await boot(app, home, models, options).catch(async (error: unknown) => {
    await stop()
    throw error
  })
  const askAs =
    (caller: Caller) =>
    <I, O>(request: Request<I, O>, input: I) =>
      wire.ask(request, input, caller)

  return {
    app,
    home,
    get sessions() {
      return need(app, sessions)
    },
    get turns() {
      return need(app, turns)
    },
    get llm() {
      return need(app, llm)
    },
    get media() {
      return need(app, media)
    },
    problems: () => pluginProblems(app),
    chat(model: string): Session {
      const session = need(app, sessions).thread(home)
      need(app, modelSettings).update(session, { model })
      return session
    },
    requests: (source: string) => need(app, replayRequests).bodies(source),
    native: (source: string) => need(app, replayRequests).native(source),
    ask: askAs({ device: 'page', kind: 'browser' }),
    askAs,
    tool(name: string, run: (input: Record<string, unknown>, context: ToolContext) => string | Promise<string>) {
      need(app, tools).register({ name, description: name, input: z.record(z.string(), z.unknown()), run })
    },
    stop,
  }
}

export const startSand = (sources: Source[], options: SandOptions = {}) =>
  start({ ids: sources.flatMap(source => source.models.map(name => `${source.id}/${name}`)), replay: sources }, options)

export const startLiveSand = (models: string[], options: SandOptions = {}) => start({ ids: models }, options)

export type Sand = Awaited<ReturnType<typeof startSand>>
