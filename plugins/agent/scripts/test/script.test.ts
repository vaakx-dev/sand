import { type Session, textOf } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import { loginAdd, loginChange } from '@sand/logins/contract'
import { type Tool, tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'
import { scriptEntry, type ScriptRun } from '../src/contract'

let sand: Awaited<ReturnType<typeof startSand>>

afterEach(() => sand.stop())

const start = () => startSand([{ id: 'parent', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['agent/scripts'] })

const script = async (session: Session, code: string, timeout_seconds?: number) => {
  const call = { type: 'tool_call', id: `script-${Bun.randomUUIDv7()}`, name: 'script', input: { title: 'Test', code, timeout_seconds } } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress: () => {}, wait: () => () => {} })
  const saved = session.entries().find(entry => entry.type === scriptEntry && (entry.data as ScriptRun).id === call.id)?.data as ScriptRun | undefined
  return { text: textOf(result.content), failed: result.isError === true, saved }
}

const words: Tool<z.ZodObject<{ page: z.ZodNumber }>> = {
  name: 'words',
  description: 'The words on a page',
  input: z.object({ page: z.number() }),
  run: ({ page }) => (page > 2 ? Promise.reject(new Error(`No page ${page}`)) : `page ${page}: ${'word '.repeat(1000 * page)}`),
}

test('a script calls tools, keeps their results to itself and returns only what it prints, and the thread keeps every call it made', async () => {
  sand = await start()
  sand.app.get(tools)!.register(words)
  const thread = sand.chat('parent/m')

  const { text, failed, saved } = await script(
    thread,
    `const pages = await Promise.all([1, 2].map(page => tools.words({ page })))
    try { await tools.mcp__sand__words({ page: 3 }) } catch (error) { console.log(error.message) }
    return pages.map(page => page.trim().split(' ').length - 2)`,
  )

  expect(failed).toBe(false)
  expect(text).toBe('No page 3\n[\n  1000,\n  2000\n]')
  expect(saved?.status).toBe('done')
  expect(saved?.calls.map(({ call }) => call.input)).toEqual([{ page: 1 }, { page: 2 }, { page: 3 }])
  expect(saved?.calls.map(({ result }) => result?.isError === true)).toEqual([false, false, true])
})

test('a script that runs past its time limit is stopped, and the agent learns why and what it printed first', async () => {
  sand = await start()
  const thread = sand.chat('parent/m')

  const started = performance.now()
  const { text, failed, saved } = await script(thread, `console.log('working'); while (true) {}`, 1)

  expect(performance.now() - started).toBeLessThan(5000)
  expect(failed).toBe(true)
  expect(text).toStartWith('Stopped at the 1 second limit.')
  expect(text).toContain('working')
  expect(saved?.status).toBe('stopped')
})

test('a script that throws reports the error with its line', async () => {
  sand = await start()
  const thread = sand.chat('parent/m')

  const { text, failed, saved } = await script(thread, `const value = 1\nnull.field`)

  expect(failed).toBe(true)
  expect(text).toContain('TypeError')
  expect(text).toContain('script.js:2')
  expect(saved?.status).toBe('failed')
})

const snap: Tool<z.ZodObject<{}>> = {
  name: 'snap',
  description: 'Takes a picture',
  input: z.object({}),
  run: () => [{ type: 'text', text: 'one picture' }, { type: 'image', mediaType: 'image/png', hash: 'picture', size: 1 }],
}

test('images a script’s tools return and the tools it finds reach the agent, even when the script prints neither', async () => {
  sand = await start()
  sand.app.get(tools)!.register(snap)
  const thread = sand.chat('parent/m')

  const call = { type: 'tool_call', id: 'script-media', name: 'script', input: { title: 'Test', code: `await tools.snap(); await tools.find_tools({ query: 'snap' }); console.log('done')` } } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: thread.cwd, signal: new AbortController().signal, conversation: thread, turn: 'test', progress: () => {}, wait: () => () => {} })

  expect(result.content).toEqual([
    { type: 'text', text: 'done' },
    { type: 'image', mediaType: 'image/png', hash: 'picture', size: 1 },
    { type: 'text', text: expect.stringContaining('## snap\nTakes a picture') },
  ])
})

test('a script’s time limit leaves out the time its tool calls take', async () => {
  sand = await start()
  sand.app.get(tools)!.register({ name: 'slow', description: 'Takes a while', input: z.object({}), run: () => Bun.sleep(1500).then(() => 'finally') })
  const thread = sand.chat('parent/m')

  const { text, failed } = await script(thread, `return await tools.slow()`, 1)

  expect(failed).toBe(false)
  expect(text).toBe('finally')
})

test('a script passes a saved login to a tool by its id, and its value is in neither the code, the saved calls nor what comes back', async () => {
  sand = await startSand([{ id: 'parent', models: ['m'], replies: [], api: 'anthropic' }], { plugins: ['agent/scripts', 'connections/logins'] })
  const value = `sk_live_${Bun.randomUUIDv7()}`
  const { id } = await sand.ask(loginAdd, { kind: 'key', name: 'Deploy key', value })
  const seen: string[] = []
  sand.app.get(tools)!.register({
    name: 'deploy',
    description: 'Deploys',
    input: z.object({ key: z.string() }),
    run: ({ key }) => {
      seen.push(key)
      return `deployed with ${key}`
    },
  })
  const thread = sand.chat('parent/m')
  await sand.ask(loginChange, { id, threads: [thread.id] })

  const { text, failed, saved } = await script(thread, `return await tools.deploy({ key: 'Bearer ' + login('${id}') })`)

  expect(failed).toBe(false)
  expect(seen).toEqual([`Bearer ${value}`])
  expect(text).not.toContain(value)
  expect(JSON.stringify(saved)).not.toContain(value)
})
