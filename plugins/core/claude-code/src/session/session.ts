import type { AppAsk, AppOutput, AppSession, AppSetup, PlanLimits } from '@sand/accounts/contract'
import { fieldsOf, forkedAside, type Json, mcpServer, SERVER_NAME, Turns } from '@sand/app-plan'
import type { ModelContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { claudeArgs, claudeEnv, type Saved } from '../cli/args'
import { connect } from '../cli/connection'
import { usageLimits } from '../account/usage'
import { messageBlocks } from './content'
import { createReader, succeeded } from './stream'

const TOOL_USE_KEY = 'claudecode/toolUseId'

const TOOL_LOADING = { 'anthropic/alwaysLoad': true, 'anthropic/maxResultSizeChars': 500_000 }

const NOTIFIED = { jsonrpc: '2.0', result: {}, id: 0 }

const savedOf = (setup: AppSetup, given?: Saved): Saved | undefined => given ?? (setup.persist ? { id: crypto.randomUUID(), start: 'new' } : undefined)

const resumable = (saved?: Saved) => (saved?.start === 'fork' ? undefined : saved)

export interface SessionNeeds {
  media: Media
  config?: string
  report(limits: PlanLimits): void
}

export const openSession = async (setup: AppSetup, output: AppOutput, needs: SessionNeeds, given?: Saved): Promise<AppSession> => {
  const { media, report } = needs
  const turns = new Turns(output)
  const serve = mcpServer({ tools: setup.tools, media, meta: TOOL_LOADING, call: ({ meta }) => turns.result(String(meta[TOOL_USE_KEY] ?? '')) })
  const reader = createReader(output, turns)
  const saved = savedOf(setup, given)
  const resumed = resumable(saved)

  const handle = async (subtype: unknown, request: Json) => {
    if (subtype === 'mcp_message') return { mcp_response: (await serve(fieldsOf(request.message))) ?? NOTIFIED }
    if (subtype === 'can_use_tool') return { behavior: 'allow', updatedInput: fieldsOf(request.input) }
    return {}
  }

  const checkUsage = () =>
    connection.request('get_usage', { skip_behaviors: true }).then(
      usage => {
        const limits = usageLimits(usage, reader.resets())
        if (limits) report(limits)
      },
      () => {},
    )

  const onMessage = (message: Json) => {
    if (message.type !== 'result') return reader.read(message)
    const checked = checkUsage()
    if (succeeded(message)) return reader.finish(message)
    void checked.then(() => reader.finish(message))
  }

  const connection = await connect({
    args: claudeArgs({ ...setup, saved }),
    env: { ...claudeEnv(needs.config), CLAUDE_CODE_PROMPT_CACHE_TTL: '5m' },
    cwd: setup.cwd,
    handle,
    onMessage,
    onExit: error => output.exit(error),
  })
  await connection.request('initialize', { sdkMcpServers: [SERVER_NAME], systemPrompt: [setup.system] })

  const prompt = (content: ModelContent[]) =>
    connection.send({ type: 'user', message: { role: 'user', content: messageBlocks(content, media) }, parent_tool_use_id: null, client_composed: true })

  return turns.session({
    ...(resumed && {
      id: resumed.id,
      aside: ({ question }: AppAsk, signal?: AbortSignal) => forkedAside(fork => openSession(setup, fork, needs, { id: resumed.id, start: 'fork' }), question, signal),
    }),
    pid: connection.pid,
    prompt,
    steer: prompt,
    stop: () => void connection.request('interrupt').catch(() => {}),
    close: () => connection.close(),
  })
}
