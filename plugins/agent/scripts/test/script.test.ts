import { type Session, textOf } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
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
