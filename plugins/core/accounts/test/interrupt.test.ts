import { type Message, textOf } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { tmpdir } from 'node:os'
import { createBridge } from '../src/apps/bridge'
import type { AppOutput, AppPlan, LLMEvent, LLMRequest, ThreadRef } from '../src/contract'

const asked = (text: string): Message => ({ role: 'user', content: [{ type: 'text', text }] })

const interruptedLook: Message = { role: 'user', content: [{ type: 'tool_result', callId: 'look-sky', content: [{ type: 'text', text: 'Interrupted' }], isError: true }] }

const lookAround = (output: AppOutput) => {
  output.call({ id: 'look-sky', name: 'look', input: { at: 'sky' } })
  output.pause()
  output.call({ id: 'look-sea', name: 'look', input: { at: 'sea' } })
  output.pause()
}

const sayHello = (output: AppOutput) => {
  output.text('Hello')
  output.finish('end_turn')
}

const lookingApp = () => {
  const heard: string[] = []
  let sends = 0
  const plan: AppPlan = {
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
        send(content) {
          heard.push(`send: ${textOf(content)}`)
          sends += 1
          if (sends === 1) lookAround(output)
          else sayHello(output)
        },
        answer: id => void heard.push(`answer: ${id}`),
        interrupt: async () => void heard.push('interrupt'),
        close: async () => {},
      }
    },
  }
  return { plan, heard }
}

const finalMessage = async (events: AsyncIterable<LLMEvent>) => {
  let last: Message | undefined
  for await (const event of events) if (event.type === 'done') last = event.message
  return last
}

test('stopping a turn while its tool runs stops the app, so the next turn starts with the new message and not a leftover call', async () => {
  const { plan, heard } = lookingApp()
  const bridge = createBridge(plan, tmpdir(), () => undefined)
  const thread: ThreadRef = { id: 'thread', generation: 1, fresh: true, seenHead: null, cwd: tmpdir() }
  const request = (delta: Message[], ref: ThreadRef): LLMRequest & { model: string } => ({ model: 'm', system: '', messages: delta, delta, tools: [], thread: ref })
  const turn = new AbortController()

  const first = await finalMessage(bridge.stream(request([asked('Look at the sky and the sea')], thread), turn.signal))
  turn.abort()
  const next = await finalMessage(bridge.stream(request([interruptedLook, asked('Never mind, say hello')], { ...thread, fresh: false, seenHead: 'head-1' })))
  bridge.close()

  expect(first?.content).toEqual([{ type: 'tool_call', id: 'look-sky', name: 'look', input: { at: 'sky' } }])
  expect(next?.content).toEqual([{ type: 'text', text: 'Hello' }])
  expect(heard).toEqual(['send: Look at the sky and the sea', 'interrupt', expect.stringMatching(/^send: .*Never mind, say hello$/s)])
})
