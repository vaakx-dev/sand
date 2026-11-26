import type { Message } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { tmpdir } from 'node:os'
import { createBridge } from '../src/apps/bridge'
import type { AppPlan, AppSetup, LLMRequest, ThreadRef, ToolLoading, ToolSpec } from '../src/contract'

const schema = { type: 'object' }

const search: ToolSpec = { name: 'find_tools', description: 'Load more tools', inputSchema: schema }

const calendar = (found: boolean): ToolSpec => ({ name: 'calendar', description: 'Read a calendar', inputSchema: schema, deferred: { found } })

const asked = (text: string): Message => ({ role: 'user', content: [{ type: 'text', text }] })

const fakePlan = (toolLoading: ToolLoading) => {
  const opened: string[][] = []
  const plan: AppPlan = {
    id: 'fake',
    label: 'Fake',
    name: 'Fake',
    detail: '',
    logo: '',
    app: 'Fake',
    install: '',
    caps: { native: true, resume: true, inject: false, reconfigure: [], processScope: 'thread', cacheTtlMs: 300_000 },
    toolLoading,
    status: async () => ({ installed: true, signedIn: true }),
    signIn: () => Promise.reject(new Error('no sign-in')),
    signOut: async () => {},
    models: async () => [],
    async open(setup: AppSetup, output) {
      opened.push(setup.tools.map(tool => tool.name))
      return {
        id: 'native-1',
        send() {
          output.text('ok')
          output.finish('end_turn')
        },
        answer() {},
        interrupt: async () => {},
        close: async () => {},
      }
    },
  }
  return { plan, opened }
}

const step = async (bridge: ReturnType<typeof createBridge>, thread: ThreadRef, tools: ToolSpec[], text: string) => {
  const request: LLMRequest & { model: string } = { model: 'm', system: 'Be brief.', messages: [asked(text)], delta: [asked(text)], tools, thread }
  for await (const _ of bridge.stream(request)) continue
}

const findingCalendar = async (toolLoading: ToolLoading) => {
  const { plan, opened } = fakePlan(toolLoading)
  const bridge = createBridge(plan, tmpdir(), () => undefined)
  const thread: ThreadRef = { id: 'thread', generation: 1, fresh: true, seenHead: null, cwd: tmpdir() }
  await step(bridge, thread, [search, calendar(false)], 'Load the calendar tool.')
  await step(bridge, { ...thread, fresh: false, seenHead: 'head-1' }, [search, calendar(true)], 'What is on Monday?')
  bridge.close()
  return opened
}

test('an app with its own tool search gets every tool once and keeps its session when a tool is found', async () => {
  expect(await findingCalendar('search')).toEqual([['find_tools', 'calendar']])
})

test('an app that searches tools itself but fixes them at thread start gets every tool once and keeps its thread when one is found', async () => {
  expect(await findingCalendar('fixed')).toEqual([['find_tools', 'calendar']])
})

test('an app without tool search is reopened with the tool once it is found', async () => {
  expect(await findingCalendar('reopen')).toEqual([['find_tools'], ['find_tools', 'calendar']])
})
