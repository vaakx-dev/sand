import type { Message } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { tmpdir } from 'node:os'
import { createBridge } from '../src/apps/bridge'
import type { AppOutput, AppPlan, ContextReport, LLMEvent, LLMRequest, ThreadRef } from '../src/contract'

const WINDOW = 200_000
const USED = 12_000

const asked: Message = { role: 'user', content: [{ type: 'text', text: 'Look at the sky and the sea' }] }

const lookedAt = (at: string): Message => ({ role: 'user', content: [{ type: 'tool_result', callId: `look-${at}`, content: [{ type: 'text', text: `A calm ${at}` }] }] })

const lookTwiceInOneReply = (output: AppOutput) => {
  output.context({ window: WINDOW, used: USED })
  output.call({ id: 'look-sky', name: 'look', input: { at: 'sky' } })
  output.pause()
}

const lookAgain = (output: AppOutput) => {
  output.call({ id: 'look-sea', name: 'look', input: { at: 'sea' } })
  output.pause()
}

const parallelApp = (): AppPlan => ({
  id: 'looker',
  label: 'Looker',
  name: 'Looker',
  detail: '',
  logo: '',
  app: 'Looker',
  install: '',
  caps: { native: true, resume: true, inject: false, reconfigure: [], processScope: 'thread', cacheTtlMs: 300_000 },
  toolLoading: 'reopen',
  status: async () => ({ installed: true, signedIn: true }),
  signIn: () => Promise.reject(new Error('no sign-in')),
  signOut: async () => {},
  models: async () => [],
  async open(_setup, output) {
    return {
      id: 'looker-thread',
      send: () => lookTwiceInOneReply(output),
      answer: id => (id === 'look-sky' ? lookAgain(output) : undefined),
      interrupt: async () => {},
      close: async () => {},
    }
  },
})

const contextOf = async (events: AsyncIterable<LLMEvent>) => {
  let found: ContextReport | undefined
  for await (const event of events) if (event.type === 'done') found = event.context
  return found
}

test('a step that runs a queued tool call without a new model call keeps the context the app last reported', async () => {
  const bridge = createBridge(parallelApp(), tmpdir(), () => undefined)
  const thread: ThreadRef = { id: 'thread', generation: 1, fresh: true, seenHead: null, cwd: tmpdir() }
  const request = (delta: Message[], ref: ThreadRef): LLMRequest & { model: string } => ({ model: 'm', system: '', messages: delta, delta, tools: [], thread: ref })

  const first = await contextOf(bridge.stream(request([asked], thread)))
  const second = await contextOf(bridge.stream(request([lookedAt('sky')], { ...thread, fresh: false, seenHead: 'head-1' })))
  bridge.close()

  expect(first).toEqual({ window: WINDOW, used: USED })
  expect(second).toEqual({ window: WINDOW, used: USED })
})
