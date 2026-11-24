import type { AppAsk } from '@sand/accounts/contract'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { ASIDE_REPLY, type Call, fakeAgy } from './fake-agy'

let folder: string

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'sand-agy-'))
})

afterEach(() => rm(folder, { recursive: true, force: true }))

const chatThenAside = async (said: string, ask: AppAsk) => {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'chat.ts'), folder, said, JSON.stringify(ask)], {
    env: { ...process.env, PATH: `${folder}${delimiter}${process.env.PATH}` },
    stderr: 'inherit',
  })
  const [printed, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  expect(code).toBe(0)
  return JSON.parse(printed)
}

const byProcess = (calls: Call[]) => [...Map.groupBy(calls, call => call.pid).values()]

test('an aside asks a separate tool-less agy agent about the recent chat and leaves the chat’s own session alone', async () => {
  const agy = await fakeAgy(folder)
  const reply = await chatThenAside('Fix the login bug', {
    question: 'What will the user most likely say next?',
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'Fix the login bug' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Fixed it, and the auth tests pass.' }] },
    ],
  })
  expect(reply).toEqual({ text: ASIDE_REPLY, usage: { input: 600, output: 4, cacheRead: 0, cacheWrite: 0 } })

  const [chat, aside] = byProcess(await agy.calls())
  expect(chat!.filter(call => call.method === 'session/prompt')).toHaveLength(1)
  expect(chat!.filter(call => call.method === 'session/new')).toHaveLength(1)

  const prompt = JSON.stringify(aside!.find(call => call.method === 'session/prompt')!.params.prompt)
  expect(prompt).toContain('Fixed it, and the auth tests pass.')
  expect(prompt).toContain('What will the user most likely say next?')
  expect(aside!.find(call => call.method === 'session/new')!.params.mcpServers).toEqual([])
  expect(aside!.filter(call => call.method === 'session/set_config_option').map(call => call.params.value)).toEqual(['gemini-test', 'low'])
  expect(aside!.at(-1)!.method).toBe('session/close')
})
