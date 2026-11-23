import { textOf, type ToolResultBlock } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

const QUIET_SILENCE_MS = 1_000
const REPEATING_SILENCE_MS = 2_000
const CHATTY_SILENCE_MS = 4_000
const LIMIT_MS = 8_000
const ENDED_WAIT_MS = 20_000
const TEST_TIMEOUT_MS = 30_000

let sand: Sand

afterEach(() => sand.stop())

const quiet = `bun -e "setInterval(() => {}, 1000)"`

const randomName = `Math.random().toString(36).replace(/[^a-z]/g, '')`

const repeating = `bun -e "setInterval(() => console.error('Cannot resolve the file /tmp/' + ${randomName} + '/' + ${randomName} + '.txt'), 100)"`

const chatty = `bun -e "console.error('pid', process.pid); setInterval(() => console.error('passed ' + ${randomName}), 100)"`

const until = async <T>(found: () => T | undefined) => {
  for (const end = Date.now() + ENDED_WAIT_MS; Date.now() < end; await Bun.sleep(50)) {
    const value = found()
    if (value) return value
  }
  throw new Error('It never happened')
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

test('a silent command, or one that only repeats an error about different files, is stopped at the no-output limit, and one that keeps writing new lines, even only errors, at the total limit with its process gone', async () => {
  sand = await startSand(
    [
      {
        id: 'fake',
        models: ['m'],
        replies: [
          [
            { type: 'call', name: 'shell', id: 'quiet', input: { command: quiet, silence_ms: QUIET_SILENCE_MS } },
            { type: 'call', name: 'shell', id: 'repeating', input: { command: repeating, silence_ms: REPEATING_SILENCE_MS } },
            { type: 'call', name: 'shell', id: 'chatty', input: { command: chatty, silence_ms: CHATTY_SILENCE_MS } },
          ],
          [{ type: 'text', text: 'Done' }],
        ],
      },
    ],
    { plugins: ['agent/shell'], options: { shell: { limit_ms: LIMIT_MS } } },
  )
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Run them', clientRequestId: 'one' })
  await until(() => !sand.turns.current(chat))

  const results = chat
    .path()
    .flatMap(entry => (entry.type === 'message' ? (entry.data as { content: ToolResultBlock[] }).content : []))
    .filter(block => block.type === 'tool_result')
  const output = (id: string) => textOf(results.find(block => block.callId === id)?.content ?? [])

  expect(output('quiet')).toMatch(/stopped: no output for/)
  expect(output('repeating')).toMatch(/stopped: only repeated output for [\d.]+ minutes, like: Cannot resolve the file \/tmp\//)
  expect(output('chatty')).toMatch(/passed [a-z]+[\s\S]*stopped: still running after/)
  const pid = Number(/pid (\d+)/.exec(output('chatty'))?.[1])
  expect(alive(pid)).toBe(false)
}, TEST_TIMEOUT_MS)
