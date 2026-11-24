import { appendFileSync, chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface Call {
  pid: number
  agent?: string
  method: string
  params: Record<string, unknown>
}

const DEFAULT_REPLY = 'Done.'
const ASIDE_REPLY = 'Run the tests'
const DEFAULT_AGENT_TOKENS = 10_000
const ASIDE_AGENT_TOKENS = 600

const wrapper = async (folder: string, log: string) => {
  const call = [process.execPath, import.meta.path, log].map(part => `"${part}"`).join(' ')
  if (process.platform === 'win32') return Bun.write(join(folder, 'agy.cmd'), `@${call} %*\r\n`)
  const path = join(folder, 'agy')
  await Bun.write(path, `#!/bin/sh\nexec ${call} "$@"\n`)
  chmodSync(path, 0o755)
}

const fakeAgy = async (folder: string) => {
  const log = join(folder, 'calls.jsonl')
  await Bun.write(log, '')
  await wrapper(folder, log)
  const calls = async (): Promise<Call[]> =>
    (await Bun.file(log).text())
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  return { calls }
}

const serve = async (log: string, agent: string | undefined) => {
  const sessions = new Map<string, string>()
  const write = (message: unknown) => process.stdout.write(`${JSON.stringify(message)}\n`)
  const update = (sessionId: string, sessionUpdate: string, text: string) => write({ jsonrpc: '2.0', method: 'session/update', params: { sessionId, update: { sessionUpdate, content: { type: 'text', text } } } })
  const loaded = (cwd: string) => !!agent && existsSync(join(cwd, '.agents', 'agents', `${agent}.md`))
  const configOptions = [
    { id: 'model', category: 'model', currentValue: 'gemini-test', options: [{ value: 'gemini-test', name: 'Gemini Test' }] },
    { id: 'thought_level', category: 'thought_level', currentValue: 'high', options: ['low', 'high'].map(value => ({ value, name: value })) },
  ]

  const answer = (method: string, params: Record<string, unknown>) => {
    if (method === 'initialize') return { protocolVersion: 1, agentCapabilities: { _meta: { antigravity: { systemPrompt: { append: true } } } } }
    if (method === 'session/new') {
      const sessionId = crypto.randomUUID()
      sessions.set(sessionId, String(params.cwd))
      return { sessionId, configOptions }
    }
    if (method === 'session/set_config_option') return { configOptions }
    if (method === 'session/prompt') {
      const sessionId = String(params.sessionId)
      const aside = loaded(sessions.get(sessionId) ?? '')
      update(sessionId, 'agent_thought_chunk', 'Thinking it over')
      update(sessionId, 'agent_message_chunk', aside ? ASIDE_REPLY : DEFAULT_REPLY)
      return { stopReason: 'end_turn', usage: { inputTokens: aside ? ASIDE_AGENT_TOKENS : DEFAULT_AGENT_TOKENS, outputTokens: 4 } }
    }
    return {}
  }

  let buffer = ''
  for await (const chunk of Bun.stdin.stream()) {
    buffer += new TextDecoder().decode(chunk)
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines.filter(Boolean)) {
      const { id, method, params } = JSON.parse(line)
      if (!method) continue
      appendFileSync(log, `${JSON.stringify({ pid: process.pid, agent, method, params })}\n`)
      if (id !== undefined) write({ jsonrpc: '2.0', id, result: answer(method, params ?? {}) })
    }
  }
}

if (import.meta.main) {
  const [log, ...args] = process.argv.slice(2) as [string, ...string[]]
  const agentAt = args.indexOf('--agent')
  await serve(log, agentAt < 0 ? undefined : args[agentAt + 1])
}

export { ASIDE_REPLY, fakeAgy, type Call }
