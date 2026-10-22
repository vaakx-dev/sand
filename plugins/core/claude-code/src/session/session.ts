import type { AppOutput, AppSession, AppSetup, PlanLimits } from '@sand/accounts/contract'
import type { ToolResultBlock, UserContent } from '@sand/chats/contract'
import { claudeArgs, claudeEnv } from '../cli/args'
import { connect, fieldsOf, type Json } from '../cli/connection'
import { usageLimits } from '../account/usage'
import { messageBlock } from './content'
import { createReader } from './stream'
import { serverName, toolServer } from './tools'

const cacheTtl = (setup: AppSetup) => (setup.sessionKind === 'thread' ? '1h' : '5m')

const earlier = (history: string) => `Earlier in this conversation (carried over from sand):\n\n${history}\n\n---\n\n`

export const openSession = async (setup: AppSetup, output: AppOutput, report: (limits: PlanLimits) => void): Promise<AppSession> => {
  const answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  const answerFor = (id: string) => {
    const found = answers.get(id) ?? Promise.withResolvers<ToolResultBlock>()
    answers.set(id, found)
    return found
  }
  const serve = toolServer(setup.tools, id => answerFor(id).promise)
  const reader = createReader(output)
  let history = setup.history
  let interrupted = false

  const handle = async (subtype: unknown, request: Json) => {
    if (subtype === 'mcp_message') return { mcp_response: await serve(fieldsOf(request.message)) }
    if (subtype === 'can_use_tool') return { behavior: 'allow', updatedInput: fieldsOf(request.input) }
    return {}
  }

  const checkUsage = () =>
    connection.request('get_usage', { skip_behaviors: true }).then(
      usage => {
        const limits = usageLimits(usage)
        if (limits) report(limits)
      },
      () => {},
    )

  const onMessage = (message: Json) => {
    if (message.type !== 'result') return reader.read(message)
    if (interrupted) return
    reader.finish(message)
    void checkUsage()
  }

  const connection = await connect({
    args: claudeArgs(setup),
    env: { ...claudeEnv(), CLAUDE_CODE_PROMPT_CACHE_TTL: cacheTtl(setup) },
    cwd: setup.cwd,
    handle,
    onMessage,
    onExit: error => output.fail(error),
  })
  await connection.request('initialize', { sdkMcpServers: [serverName], systemPrompt: [setup.system] })

  const send = (content: UserContent[]) => {
    const blocks = content.map(messageBlock)
    const intro = history ? [{ type: 'text', text: earlier(history) }] : []
    history = ''
    connection.send({ type: 'user', message: { role: 'user', content: [...intro, ...blocks] }, parent_tool_use_id: null })
  }

  return {
    send,
    steer: send,
    answer: (id, result) => answerFor(id).resolve(result),
    interrupt() {
      interrupted = true
      void connection.request('interrupt').catch(() => {})
    },
    close() {
      connection.close()
      answers.forEach(found => {
        found.promise.catch(() => {})
        found.reject(new Error('sand stopped this turn'))
      })
    },
  }
}
