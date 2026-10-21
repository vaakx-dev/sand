import type { AppOutput, AppSession, AppSetup } from '@sand/accounts/contract'
import type { ToolResultBlock, UserContent } from '@sand/chats/contract'
import { fieldsOf, type Json } from '../server/rpc'
import type { CodexServer } from '../server/server'
import { inputItem, toolOutput } from './content'

const earlier = (history: string) => `Earlier in this conversation (carried over from sand):\n\n${history}\n\n---\n\n`

const dynamicTool = ({ name, description, inputSchema }: AppSetup['tools'][number]) => ({ type: 'function', name, description, inputSchema })

const usageMeter = (output: AppOutput) => {
  let before = { input: 0, cached: 0, written: 0, output: 0 }
  return (total: Json) => {
    const now = { input: Number(total.inputTokens ?? 0), cached: Number(total.cachedInputTokens ?? 0), written: Number(total.cacheWriteInputTokens ?? 0), output: Number(total.outputTokens ?? 0) }
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

export const openSession = async (server: CodexServer, setup: AppSetup, output: AppOutput): Promise<AppSession> => {
  const { thread } = await server.request('thread/start', {
    model: setup.model,
    cwd: setup.cwd,
    approvalPolicy: 'never',
    sandbox: 'read-only',
    baseInstructions: setup.system,
    ephemeral: true,
    dynamicTools: setup.tools.map(dynamicTool),
    config: { project_doc_max_bytes: 0 },
  })
  const threadId = String(fieldsOf(thread).id)
  const answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  const meter = usageMeter(output)
  let history = setup.history
  let turnId: string | undefined

  const answerFor = (id: string) => {
    const found = answers.get(id) ?? Promise.withResolvers<ToolResultBlock>()
    answers.set(id, found)
    return found
  }

  const notify = (method: string, params: Json) => {
    if (method === 'turn/started') turnId = String(fieldsOf(params.turn).id)
    if (method === 'item/agentMessage/delta') output.text(String(params.delta ?? ''))
    if (method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta') output.thinking(String(params.delta ?? ''))
    if (method === 'thread/tokenUsage/updated') meter(fieldsOf(fieldsOf(params.tokenUsage).total))
    if (method !== 'turn/completed') return
    const turn = fieldsOf(params.turn)
    if (turn.status === 'completed') output.finish()
    else if (turn.status === 'failed') output.fail(failure(turn))
  }

  const call = async (params: Json) => {
    const id = String(params.callId)
    output.call({ id, name: String(params.tool), input: fieldsOf(params.arguments) })
    output.pause()
    return toolOutput(await answerFor(id).promise)
  }

  const forget = server.thread(threadId, { notify, call, fail: error => output.fail(error) })

  return {
    send(content: UserContent[]) {
      const intro = history ? [{ type: 'text', text: earlier(history), text_elements: [] }] : []
      history = ''
      void server
        .request('turn/start', { threadId, input: [...intro, ...content.map(inputItem)], model: setup.model, ...(setup.effort && { effort: setup.effort }), summary: 'auto' })
        .catch(error => output.fail(error))
    },
    steer(content: UserContent[]) {
      if (!turnId) return
      void server.request('turn/steer', { threadId, expectedTurnId: turnId, input: content.map(inputItem) }).catch(error => output.fail(error))
    },
    answer: (id, result) => answerFor(id).resolve(result),
    interrupt() {
      if (turnId) void server.request('turn/interrupt', { threadId, turnId }).catch(() => {})
    },
    close() {
      forget()
      answers.forEach(found => {
        found.promise.catch(() => {})
        found.reject(new Error('sand stopped this turn'))
      })
      void server.request('thread/unsubscribe', { threadId }).catch(() => {})
    },
  }
}
