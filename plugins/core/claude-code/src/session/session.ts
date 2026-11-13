import type { AppOutput, AppSession, AppSetup, PlanLimits } from '@sand/accounts/contract'
import type { ModelContent, ToolResultBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { claudeArgs, claudeEnv, type Saved } from '../cli/args'
import { connect, fieldsOf, type Json } from '../cli/connection'
import { usageLimits } from '../account/usage'
import { askAside } from './aside'
import { messageBlock } from './content'
import { createReader } from './stream'
import { serverName, toolServer } from './tools'

const savedOf = (setup: AppSetup, given?: Saved): Saved | undefined => given ?? (setup.persist ? { id: crypto.randomUUID(), start: 'new' } : undefined)

const resumable = (saved?: Saved) => (saved?.start === 'fork' ? undefined : saved)

export interface SessionNeeds {
  media: Media
  report(limits: PlanLimits): void
}

export const openSession = async (setup: AppSetup, output: AppOutput, needs: SessionNeeds, given?: Saved): Promise<AppSession> => {
  const { media, report } = needs
  const answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  const answerFor = (id: string) => {
    const found = answers.get(id) ?? Promise.withResolvers<ToolResultBlock>()
    answers.set(id, found)
    return found
  }
  const serve = toolServer(setup.tools, id => answerFor(id).promise, media)
  const toBlock = messageBlock(media)
  const reader = createReader(output)
  const saved = savedOf(setup, given)
  const resumed = resumable(saved)
  let running = false
  let stopped: PromiseWithResolvers<void> | undefined

  const dropAnswers = () => {
    answers.forEach(found => {
      found.promise.catch(() => {})
      found.reject(new Error('sand stopped this turn'))
    })
    answers.clear()
  }

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
    running = false
    void checkUsage()
    if (!stopped) return reader.finish(message)
    stopped.resolve()
    stopped = undefined
  }

  const connection = await connect({
    args: claudeArgs({ ...setup, saved }),
    env: { ...claudeEnv(), CLAUDE_CODE_PROMPT_CACHE_TTL: '5m' },
    cwd: setup.cwd,
    handle,
    onMessage,
    onExit: error => output.exit(error),
  })
  await connection.request('initialize', { sdkMcpServers: [serverName], systemPrompt: [setup.system] })

  const send = (content: ModelContent[]) => {
    running = true
    connection.send({ type: 'user', message: { role: 'user', content: content.map(toBlock) }, parent_tool_use_id: null, client_composed: true })
  }

  return {
    ...(resumed && { id: resumed.id }),
    pid: connection.pid,
    send,
    ...(resumed && { aside: (prompt: string, signal?: AbortSignal) => askAside(fork => openSession(setup, fork, needs, { id: resumed.id, start: 'fork' }), prompt, signal) }),
    steer: send,
    answer: (id, result) => answerFor(id).resolve(result),
    interrupt() {
      dropAnswers()
      if (!running) return Promise.resolve()
      stopped ??= Promise.withResolvers<void>()
      void connection.request('interrupt').catch(() => {})
      return stopped.promise
    },
    close() {
      dropAnswers()
      return connection.close()
    },
  }
}
