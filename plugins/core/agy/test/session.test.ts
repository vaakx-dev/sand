import { type AppCall, type AppOutput, ProviderTrouble, type Usage } from '@sand/accounts/contract'
import type { Json } from '@sand/app-plan'
import type { StopReason } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { expect, test } from 'bun:test'
import type { AcpClient } from '../src/acp'
import { openSession } from '../src/session'

interface Prompt {
  text: string
  reply: PromiseWithResolvers<Json>
}

const media: Media = { put: () => ({ hash: '', size: 0, mediaType: '' }), path: () => '', data: () => undefined, exclude: () => {}, include: () => {}, inUse: () => () => {} }

const fakeAgy = () => {
  const prompts: Prompt[] = []
  const waiters: Array<(prompt: Prompt) => void> = []
  let mcpUrl = ''
  let mcpToken = ''

  const request = async (method: string, params: Json = {}) => {
    if (method === 'session/new') {
      const [server] = params.mcpServers as Array<{ env: Array<{ name: string; value: string }> }>
      const env = new Map(server!.env.map(({ name, value }) => [name, value]))
      mcpUrl = env.get('SAND_MCP_URL')!
      mcpToken = env.get('SAND_MCP_TOKEN')!
      return { sessionId: 'agy-session' }
    }
    if (method !== 'session/prompt') return {}
    const [block] = params.prompt as Array<{ text: string }>
    const prompt = { text: block!.text, reply: Promise.withResolvers<Json>() }
    prompts.push(prompt)
    waiters.shift()?.(prompt)
    return prompt.reply.promise
  }

  const client: AcpClient = { pid: 1, init: {}, request, notify() {}, close: async () => {} }

  return {
    connect: async () => client,
    nextPrompt: () => new Promise<Prompt>(resolve => waiters.push(resolve)),
    callTool: (name: string, input: Json) =>
      fetch(mcpUrl, {
        method: 'POST',
        headers: { authorization: `Bearer ${mcpToken}` },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: input } }),
      }).then(response => response.json()),
  }
}

const recorder = () => {
  const calls: AppCall[] = []
  const usage: Partial<Usage>[] = []
  const finishes: (StopReason | undefined)[] = []
  const called = Promise.withResolvers<AppCall>()
  const finished = Promise.withResolvers<void>()
  const failed = Promise.withResolvers<unknown>()
  const output: AppOutput = {
    text() {},
    thinking() {},
    call: call => {
      calls.push(call)
      called.resolve(call)
    },
    usage: reported => void usage.push(reported),
    context() {},
    pause() {},
    finish: stopReason => {
      finishes.push(stopReason)
      finished.resolve()
    },
    fail: error => failed.resolve(error),
    exit() {},
  }
  return { output, usage, finishes, called: called.promise, finished: finished.promise, failed: failed.promise }
}

test('a steer during a sand tool call goes to agy as another prompt; the tool still gets its answer and only the newest prompt’s reply ends the step', async () => {
  const agy = fakeAgy()
  const seen = recorder()
  const tools = [{ name: 'look', description: 'Look at something', inputSchema: { type: 'object' } }]
  const session = await openSession({ model: 'gemini-test', system: '', tools, cwd: '/work', persist: false }, seen.output, { media, asides: '/asides', report() {}, connect: agy.connect })

  const first = agy.nextPrompt()
  session.send([{ type: 'text', text: 'Look at the sky' }])
  const opening = await first
  const toolReply = agy.callTool('mcp_sand_look', { at: 'sky' })
  const call = await seen.called

  const second = agy.nextPrompt()
  session.steer!([{ type: 'text', text: 'Also check the sea' }])
  const steer = await second
  opening.reply.resolve({ stopReason: 'end_turn', usage: { inputTokens: 100, outputTokens: 5 } })
  session.answer(call.id, { type: 'tool_result', callId: call.id, content: [{ type: 'text', text: 'Clear and blue' }] })

  expect(steer.text).toBe('Also check the sea')
  expect(await toolReply).toMatchObject({ result: { content: [{ type: 'text', text: 'Clear and blue' }] } })
  expect(seen.finishes).toEqual([])

  steer.reply.resolve({ stopReason: 'max_tokens', usage: { inputTokens: 20, outputTokens: 7, cachedReadTokens: 90 } })
  await seen.finished

  expect(seen.finishes).toEqual(['max_tokens'])
  expect(seen.usage).toEqual([
    { input: 100, output: 5, cacheRead: 0, cacheWrite: 0 },
    { input: 20, output: 7, cacheRead: 90, cacheWrite: 0 },
  ])
  await session.close()
})

const failureFor = async (message: string) => {
  const agy = fakeAgy()
  const seen = recorder()
  const tools = [{ name: 'look', description: 'Look at something', inputSchema: { type: 'object' } }]
  const session = await openSession({ model: 'gemini-test', system: '', tools, cwd: '/work', persist: false }, seen.output, { media, asides: '/asides', report() {}, connect: agy.connect })
  const next = agy.nextPrompt()
  session.send([{ type: 'text', text: 'Hi' }])
  const prompt = await next
  prompt.reply.reject(new Error(message))
  const error = await seen.failed
  await session.close()
  return error
}

test('agy failing a prompt on a busy server is provider trouble that sand retries, and a refusal is a plain failure', async () => {
  const busy = await failureFor('generating and executing: transport error (Unavailable, HTTP 503): The model is overloaded. Please try again later.')
  const refused = await failureFor('generating and executing: transport error (InvalidArgument, HTTP 400): Request contains an invalid argument.')

  expect(busy).toBeInstanceOf(ProviderTrouble)
  expect(refused).toBeInstanceOf(Error)
  expect(refused).not.toBeInstanceOf(ProviderTrouble)
})
