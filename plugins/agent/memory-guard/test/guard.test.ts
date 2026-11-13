import { textOf, type ToolResultBlock } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

const EATEN_MB = 400
const ENDED_WAIT_MS = 15_000

let sand: Sand

afterEach(() => sand.stop())

const eater = `bun -e "const kept = Buffer.alloc(${EATEN_MB} * 1024 * 1024, 1); setInterval(() => kept[0]++, 1000)"`

const alwaysLow = { every_ms: 100, low_percent: 100, low_mb: 1_000_000_000 }

const until = async <T>(found: () => T | undefined) => {
  for (const end = Date.now() + ENDED_WAIT_MS; Date.now() < end; await Bun.sleep(50)) {
    const value = found()
    if (value) return value
  }
  throw new Error('It never happened')
}

test('when memory stays low, the chat using the most is stopped and its command killed, and the agent hears why', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'call', name: 'shell', id: 'eat', input: { command: eater } }]] }], {
    plugins: ['agent/shell', 'agent/processes', 'agent/memory-guard'],
    options: { 'memory-guard': alwaysLow },
  })
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Eat memory', clientRequestId: 'one' })

  const [turn] = await until(() => {
    const turns = sand.turns.list(chat)
    return sand.turns.current(chat) ? undefined : turns
  })

  expect(turn).toMatchObject({ status: 'interrupted', stopReason: 'interrupted', error: 'out of memory' })
  const result = chat
    .path()
    .flatMap(entry => (entry.type === 'message' ? (entry.data as { content: ToolResultBlock[] }).content : []))
    .find(block => block.type === 'tool_result' && block.callId === 'eat')
  expect(textOf(result?.content ?? [])).toMatch(/ran out of memory.*this chat's processes used \d+ MB/)
})
