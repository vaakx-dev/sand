import { llm, llmModels } from '@sand/accounts/contract'
import { cli } from '@sand/config/contract'
import { media } from '@sand/media/contract'
import { projectFiles } from '@sand/project/contract'
import { createApp, scopeError, type ContextCore } from 'drydock'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const builtins = resolve(import.meta.dir, '..', '..', '..')

const plugins = ['core/paths', 'core/media', 'core/chats', 'core/claude-code', 'core/codex', 'core/accounts']

const waitMs = 60_000

const runtimeEntry = async (folder: string) => {
  const dir = join(builtins, folder)
  const { sand } = await Bun.file(join(dir, 'package.json')).json()
  return resolve(dir, sand.runtime)
}

const modelsReady = (app: ContextCore, ids: string[]) =>
  new Promise<void>((done, fail) => {
    const missing = () => ids.filter(id => !app.get(llm)?.find?.(id))
    const timer = setTimeout(() => {
      stop()
      fail(new Error(`sand never offered ${missing().join(', ')}; sign in to their accounts in your sand`))
    }, waitMs)
    const check = () => {
      if (missing().length) return
      clearTimeout(timer)
      stop()
      done()
    }
    const stop = app.on(llmModels, check)
    check()
  })

export const startSand = async (models: string[]) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-bench-'))
  const app = createApp()
  const stop = async () => {
    await app.dispose()
    rmSync(home, { recursive: true, force: true })
  }
  const errors: unknown[] = []
  app.on(scopeError, (_, error) => void errors.push(error))
  app.provide(cli, { place: 'runtime', home, cwd: home, builtins, safe: true, args: [], exit() {} })
  app.provide(projectFiles, { copies: () => [], ofFolder: () => null })
  for (const plugin of plugins) app.load(await runtimeEntry(plugin), {})
  await app.settled()
  const found = { llm: app.get(llm), media: app.get(media) }
  if (errors.length || !found.llm || !found.media) {
    await stop()
    throw errors[0] ?? new Error('sand did not start its LLM service')
  }
  await modelsReady(app, models).catch(async (error: unknown) => {
    await stop()
    throw error
  })
  return { llm: found.llm, media: found.media, stop }
}
