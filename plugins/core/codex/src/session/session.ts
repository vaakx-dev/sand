import { type AppAside, type AppAsk, type AppOutput, type AppSession, type AppSetup, type HandoffBlock, type PlanLimits, UsageLimited } from '@sand/accounts/contract'
import { fieldsOf, type Json, missing, resetOf, Turns } from '@sand/app-plan'
import type { ModelContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { untilAborted } from '@sand/util'
import { limitsOf } from '../account/limits'
import { threadConfig } from '../server/args'
import type { Pool, ThreadServer } from '../server/pool'
import { inputItems, toolOutput } from './content'

export interface SessionNeeds {
  pool: Pool
  media: Media
  report(limits: PlanLimits): void
}

const ASIDE_EFFORT = 'low'

const NO_ASIDE: AppAside = { text: '', usage: {} }

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

const asideOf = (reply: Json): AppAside => {
  const input = Number(reply.inputTokens ?? 0)
  const cached = Number(reply.cachedInputTokens ?? 0)
  return { text: typeof reply.text === 'string' ? reply.text : '', usage: { input: input - cached, cacheRead: cached, output: Number(reply.outputTokens ?? 0) } }
}

const failureText = (turn: Json) => String(fieldsOf(turn.error).message ?? 'Codex stopped this turn')

const usageLimited = (turn: Json) => fieldsOf(turn.error).codexErrorInfo === 'usageLimitExceeded'

const readLimits = (pool: Pool) =>
  pool.request('account/rateLimits/read', {}).then(
    read => limitsOf(read.rateLimits),
    () => undefined,
  )

const limitReached = async ({ pool, report }: SessionNeeds, turn: Json) => {
  const limits = await readLimits(pool)
  if (limits) report(limits)
  return new UsageLimited(failureText(turn), resetOf(limits))
}

const failure = async (needs: SessionNeeds, turn: Json) => (usageLimited(turn) ? limitReached(needs, turn) : new Error(failureText(turn)))

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

export const openSession = async (needs: SessionNeeds, setup: AppSetup, output: AppOutput, resume?: string): Promise<AppSession> => {
  const { pool, media } = needs
  const turns = new Turns(output)
  const meter = usageMeter(output)
  let turnId: string | undefined
  let lastTurn: string | undefined

  const stop = () => {
    if (turnId) void server.request('turn/interrupt', { threadId, turnId }).catch(() => {})
  }

  const end = (turn: Json) => {
    lastTurn = turnId
    turnId = undefined
    if (turn.status === 'completed') return turns.finish()
    void failure(needs, turn).then(error => turns.fail(error))
  }

  const measure = (tokenUsage: Json) => {
    const window = Number(tokenUsage.modelContextWindow ?? 0)
    if (window) output.context({ window })
    meter(fieldsOf(tokenUsage.total), turnId !== undefined)
  }

  const notify = (method: string, params: Json) => {
    if (method === 'turn/started') {
      turnId = String(fieldsOf(params.turn).id)
      if (turns.stopping) stop()
    }
    if (method === 'item/agentMessage/delta') output.text(String(params.delta ?? ''))
    if (method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta') output.thinking(String(params.delta ?? ''))
    if (method === 'thread/tokenUsage/updated') measure(fieldsOf(params.tokenUsage))
    if (method === 'turn/completed') end(fieldsOf(params.turn))
  }

  const call = async (params: Json) => {
    const id = String(params.callId)
    output.call({ id, name: String(params.tool), input: fieldsOf(params.arguments) })
    output.pause()
    return toolOutput(await turns.result(id), media)
  }

  const server = await pool.open({ notify, call, exit: error => output.exit(error) })
  const threadId = await begin(server, setup, resume).catch((error: unknown) => {
    server.close()
    throw error
  })

  const request = (method: string, params: Json) => void server.request(method, { threadId, ...params }).catch(error => turns.fail(error))

  const inject = async (handoff: HandoffBlock) => {
    try {
      await server.request('thread/inject_items', { threadId, items: historyItems(handoff) })
      return true
    } catch (error) {
      if (missing(error)) return false
      throw error
    }
  }

  const aside = async ({ question }: AppAsk, signal?: AbortSignal) => {
    if (turnId || !lastTurn) return NO_ASIDE
    const sampled = server.request('thread/sample', { threadId, expectedTurnId: lastTurn, prompt: question, effort: ASIDE_EFFORT })
    try {
      return asideOf(await (signal ? untilAborted(sampled, signal) : sampled))
    } catch (error) {
      if (missing(error)) return NO_ASIDE
      throw error
    }
  }

  return turns.session({
    id: threadId,
    pid: server.pid,
    prompt: (content: ModelContent[], effort) => request('turn/start', { input: inputItems(content, media), model: setup.model, ...(effort && { effort }), summary: 'auto' }),
    steer(content: ModelContent[]) {
      if (turnId) request('turn/steer', { expectedTurnId: turnId, input: inputItems(content, media) })
    },
    stop,
    close: () => server.close(),
    inject,
    aside,
  })
}
