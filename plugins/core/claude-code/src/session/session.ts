import type { AppOutput, AppSession, AppSetup, PlanLimits } from '@sand/accounts/contract'
import type { ToolResultBlock, UserContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { claudeArgs, claudeEnv } from '../cli/args'
import { connect, fieldsOf, type Json } from '../cli/connection'
import { usageLimits } from '../account/usage'
import { messageBlock } from './content'
import { createReader } from './stream'
import { serverName, toolServer } from './tools'

const cacheTtl = (setup: AppSetup) => (setup.sessionKind === 'thread' ? '1h' : '5m')

const savedOf = (setup: AppSetup, resume?: string) => {
  if (resume) return { id: resume, resume: true }
  return setup.persist ? { id: crypto.randomUUID(), resume: false } : undefined
}

export interface SessionNeeds {
  media: Media
  report(limits: PlanLimits): void
}

export const openSession = async (setup: AppSetup, output: AppOutput, { media, report }: SessionNeeds, resume?: string): Promise<AppSession> => {
  const answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  const answerFor = (id: string) => {
    const found = answers.get(id) ?? Promise.withResolvers<ToolResultBlock>()
    answers.set(id, found)
    return found
  }
  const serve = toolServer(setup.tools, id => answerFor(id).promise, media)
  const toBlock = messageBlock(media)
  const reader = createReader(output)
  const saved = savedOf(setup, resume)
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
    env: { ...claudeEnv(), CLAUDE_CODE_PROMPT_CACHE_TTL: cacheTtl(setup) },
    cwd: setup.cwd,
    handle,
    onMessage,
    onExit: error => output.exit(error),
  })
  await connection.request('initialize', { sdkMcpServers: [serverName], systemPrompt: [setup.system] })

  const send = (content: UserContent[]) => {
    running = true
    connection.send({ type: 'user', message: { role: 'user', content: content.map(toBlock) }, parent_tool_use_id: null, client_composed: true })
  }

  return {
    ...(saved && { id: saved.id }),
    send,
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
      connection.close()
      dropAnswers()
    },
  }
}
