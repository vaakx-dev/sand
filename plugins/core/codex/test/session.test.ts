import { type AppOutput, ProviderTrouble, type ToolSpec, type Usage, UsageLimited } from '@sand/accounts/contract'
import type { Media } from '@sand/media/contract'
import { expect, test } from 'bun:test'
import type { Json } from '@sand/app-plan'
import type { Pool } from '../src/server/pool'
import type { ServerHandlers } from '../src/server/server'
import { openSession } from '../src/session/session'

interface Sent {
  method: string
  params: Json
}

const media: Media = { put: () => ({ hash: '', size: 0, mediaType: '' }), path: () => '', data: () => undefined, exclude: () => {}, include: () => {}, inUse: () => () => {} }

const schema = { type: 'object' }

const fakePool = () => {
  const servers: ServerHandlers[] = []
  const sent: Sent[] = []
  const pool: Pool = {
    request: async () => ({}),
    async open(handlers) {
      servers.push(handlers)
      return {
        pid: 1,
        async request(method: string, params: Json = {}) {
          sent.push({ method, params })
          return method === 'thread/start' ? { thread: { id: 'codex-thread' } } : {}
        },
        close: async () => {},
      }
    },
    listen: () => () => true,
    close() {},
  }
  const notify = (method: string, params: Json) => servers.forEach(server => server.notify(method, params))
  return { pool, notify, sent }
}

const recorder = () => {
  const seen = { windows: [] as number[], usage: [] as Partial<Usage>[], failed: [] as unknown[] }
  const output: AppOutput = {
    text() {},
    thinking() {},
    call() {},
    usage: usage => void seen.usage.push(usage),
    context: ({ window }) => void seen.windows.push(window ?? 0),
    pause() {},
    finish() {},
    fail: error => void seen.failed.push(error),
    exit() {},
  }
  return { seen, output }
}

const opened = async (tools: ToolSpec[] = []) => {
  const { pool, notify, sent } = fakePool()
  const { seen, output } = recorder()
  const session = await openSession({ pool, media, report() {} }, { model: 'gpt-test', system: '', tools, cwd: '/work', persist: false }, output)
  return { session, notify, sent, seen }
}

const failedTurn = (codexErrorInfo: unknown) => ({ turn: { id: 'turn-1', status: 'failed', error: { message: 'Codex stopped', codexErrorInfo } } })

test('a Codex turn reports the context window and the tokens Codex counted for it', async () => {
  const { session, notify, seen } = await opened()

  session.send([{ type: 'text', text: 'Hi' }])
  notify('turn/started', { turn: { id: 'turn-1' } })
  notify('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 1_200, cachedInputTokens: 200, outputTokens: 30 }, modelContextWindow: 258_400 } })

  expect(seen.windows).toEqual([258_400])
  expect(seen.usage).toEqual([{ input: 1_000, cacheRead: 200, cacheWrite: 0, output: 30 }])
})

test('a steer that comes before Codex has started the turn reaches the turn once it starts', async () => {
  const { session, notify, sent } = await opened()

  session.send([{ type: 'text', text: 'Plan the week' }])
  session.steer?.([{ type: 'text', text: 'Leave Friday free' }])
  notify('turn/started', { turn: { id: 'turn-1' } })

  expect(sent.filter(({ method }) => method === 'turn/steer').map(({ params }) => params)).toEqual([
    { threadId: 'codex-thread', expectedTurnId: 'turn-1', input: [{ type: 'text', text: 'Leave Friday free', text_elements: [] }] },
  ])
})

test('Codex searches sand’s on-demand tools itself, so they wait behind its tool search instead of sand’s find_tools', async () => {
  const tools: ToolSpec[] = [
    { name: 'find_tools', description: 'Load more tools', inputSchema: schema },
    { name: 'calendar', description: 'Read a calendar', inputSchema: schema },
    { name: 'tides', description: 'Look up tide times', inputSchema: schema, deferred: { found: false } },
  ]
  const { sent } = await opened(tools)

  expect(sent.find(({ method }) => method === 'thread/start')?.params.dynamicTools).toEqual([
    { type: 'function', name: 'calendar', description: 'Read a calendar', inputSchema: schema },
    { type: 'namespace', name: 'sand', description: expect.any(String), tools: [{ type: 'function', name: 'tides', description: 'Look up tide times', inputSchema: schema, deferLoading: true }] },
  ])
})

test('a Codex turn that hit a busy or dropped server is provider trouble, and one that spent the plan is out of usage', async () => {
  const failures = await Promise.all(
    ['serverOverloaded', { responseStreamDisconnected: { httpStatusCode: null } }, 'usageLimitExceeded', 'badRequest'].map(async info => {
      const { session, notify, seen } = await opened()
      session.send([{ type: 'text', text: 'Hi' }])
      notify('turn/started', { turn: { id: 'turn-1' } })
      notify('turn/completed', failedTurn(info))
      await Bun.sleep(0)
      return seen.failed[0]
    }),
  )

  expect(failures.map(error => [error instanceof ProviderTrouble, error instanceof UsageLimited])).toEqual([
    [true, false],
    [true, false],
    [false, true],
    [false, false],
  ])
})
