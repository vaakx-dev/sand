import type { AppOutput, AppSession, AppSetup, HandoffBlock } from '@sand/accounts/contract'
import type { ModelContent, ToolResultBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { threadConfig } from '../server/args'
import type { Pool, ThreadServer } from '../server/pool'
import { fieldsOf, type Json, RpcError } from '../server/rpc'
import { inputItem, toolOutput } from './content'

const methodMissing = -32601

const dynamicTool = ({ name, description, inputSchema }: AppSetup['tools'][number]) => ({ type: 'function', name, description, inputSchema })

const historyItems = ({ context, items }: HandoffBlock) => [
  { type: 'message', role: 'user', content: [{ type: 'input_text', text: context }] },
  ...items.map(({ role, text }) => ({ type: 'message', role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] })),
]

const usageMeter = (output: AppOutput) => {
  let before = { input: 0, cached: 0, written: 0, output: 0 }
  return (total: Json, counted: boolean) => {
    const now = { input: Number(total.inputTokens ?? 0), cached: Number(total.cachedInputTokens ?? 0), written: Number(total.cacheWriteInputTokens ?? 0), output: Number(total.outputTokens ?? 0) }
    if (counted)
      output.usage({
        input: now.input - now.cached - (before.input - before.cached),
        cacheRead: now.cached - before.cached,
        cacheWrite: now.written - before.written,
        output: now.output - before.output,
      })
    before = now
  }
}

const failure = (turn: Json) => new Error(String(fieldsOf(turn.error).message ?? 'Codex stopped this turn'))

const mcpServers = async (server: ThreadServer, cwd: string) => Object.keys(fieldsOf(fieldsOf((await server.request('config/read', { cwd })).config).mcp_servers))

const begin = async (server: ThreadServer, setup: AppSetup, resume?: string) => {
  const thread = {
    model: setup.model,
    cwd: setup.cwd,
    approvalPolicy: 'never',
    sandbox: 'read-only',
    baseInstructions: setup.system,
    config: threadConfig(await mcpServers(server, setup.cwd)),
  }
  const started = resume
    ? await server.request('thread/resume', { ...thread, threadId: resume, excludeTurns: true })
    : await server.request('thread/start', { ...thread, ephemeral: !setup.persist, environments: [], dynamicTools: setup.tools.map(dynamicTool) })
  return String(fieldsOf(started.thread).id)
}

export interface SessionNeeds {
  pool: Pool
  media: Media
}

export const openSession = async ({ pool, media }: SessionNeeds, setup: AppSetup, output: AppOutput, resume?: string): Promise<AppSession> => {
  const toItem = inputItem(media)
  const answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  const meter = usageMeter(output)
  let running = false
  let turnId: string | undefined
  let stopped: PromiseWithResolvers<void> | undefined

  const answerFor = (id: string) => {
    const found = answers.get(id) ?? Promise.withResolvers<ToolResultBlock>()
    answers.set(id, found)
    return found
  }

  const dropAnswers = () => {
    answers.forEach(found => {
      found.promise.catch(() => {})
      found.reject(new Error('sand stopped this turn'))
    })
    answers.clear()
  }

  const stop = () => {
    if (turnId) void server.request('turn/interrupt', { threadId, turnId }).catch(() => {})
  }

  const end = (turn: Json) => {
    running = false
    turnId = undefined
    if (stopped) {
      stopped.resolve()
      stopped = undefined
    } else if (turn.status === 'completed') output.finish()
    else output.fail(failure(turn))
  }

  const notify = (method: string, params: Json) => {
    if (method === 'turn/started') {
      turnId = String(fieldsOf(params.turn).id)
      if (stopped) stop()
    }
    if (method === 'item/agentMessage/delta') output.text(String(params.delta ?? ''))
    if (method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta') output.thinking(String(params.delta ?? ''))
    if (method === 'thread/tokenUsage/updated') meter(fieldsOf(fieldsOf(params.tokenUsage).total), turnId !== undefined)
    if (method === 'turn/completed') end(fieldsOf(params.turn))
  }

  const call = async (params: Json) => {
    const id = String(params.callId)
    output.call({ id, name: String(params.tool), input: fieldsOf(params.arguments) })
    output.pause()
    return toolOutput(await answerFor(id).promise, media)
  }

  const server = await pool.open({ notify, call, exit: error => output.exit(error) })
  const threadId = await begin(server, setup, resume).catch((error: unknown) => {
    server.close()
    throw error
  })

  const request = (method: string, params: Json) => void server.request(method, { threadId, ...params }).catch(error => output.fail(error))

  return {
    id: threadId,
    send(content: ModelContent[], effort) {
      running = true
      request('turn/start', { input: content.map(toItem), model: setup.model, ...(effort && { effort }), summary: 'auto' })
    },
    steer(content: ModelContent[]) {
      if (turnId) request('turn/steer', { expectedTurnId: turnId, input: content.map(toItem) })
    },
    answer: (id, result) => answerFor(id).resolve(result),
    async inject(handoff) {
      try {
        await server.request('thread/inject_items', { threadId, items: historyItems(handoff) })
        return true
      } catch (error) {
        if (error instanceof RpcError && error.code === methodMissing) return false
        throw error
      }
    },
    interrupt() {
      dropAnswers()
      if (!running) return Promise.resolve()
      stopped ??= Promise.withResolvers<void>()
      stop()
      return stopped.promise
    },
    close() {
      dropAnswers()
      server.close()
    },
  }
}
