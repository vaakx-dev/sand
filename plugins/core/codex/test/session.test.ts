import type { AppOutput, Usage } from '@sand/accounts/contract'
import type { Media } from '@sand/media/contract'
import { expect, test } from 'bun:test'
import type { Json } from '@sand/app-plan'
import type { Pool } from '../src/server/pool'
import type { ServerHandlers } from '../src/server/server'
import { openSession } from '../src/session/session'

const media: Media = { put: () => ({ hash: '', size: 0, mediaType: '' }), path: () => '', data: () => undefined, exclude: () => {}, include: () => {}, inUse: () => () => {} }

const fakePool = () => {
  const servers: ServerHandlers[] = []
  const pool: Pool = {
    request: async () => ({}),
    async open(handlers) {
      servers.push(handlers)
      return { pid: 1, request: async (method: string) => (method === 'thread/start' ? { thread: { id: 'codex-thread' } } : {}), close: async () => {} }
    },
    listen: () => () => true,
    close() {},
  }
  const notify = (method: string, params: Json) => servers.forEach(server => server.notify(method, params))
  return { pool, notify }
}

const recorder = () => {
  const seen = { windows: [] as number[], usage: [] as Partial<Usage>[] }
  const output: AppOutput = {
    text() {},
    thinking() {},
    call() {},
    usage: usage => void seen.usage.push(usage),
    context: ({ window }) => void seen.windows.push(window ?? 0),
    pause() {},
    finish() {},
    fail() {},
    exit() {},
  }
  return { seen, output }
}

test('a Codex turn reports the context window and the tokens Codex counted for it', async () => {
  const { pool, notify } = fakePool()
  const { seen, output } = recorder()
  const session = await openSession({ pool, media, report() {} }, { model: 'gpt-test', system: '', tools: [], cwd: '/work', persist: false }, output)

  session.send([{ type: 'text', text: 'Hi' }])
  notify('turn/started', { turn: { id: 'turn-1' } })
  notify('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 1_200, cachedInputTokens: 200, outputTokens: 30 }, modelContextWindow: 258_400 } })

  expect(seen.windows).toEqual([258_400])
  expect(seen.usage).toEqual([{ input: 1_000, cacheRead: 200, cacheWrite: 0, output: 30 }])
})
