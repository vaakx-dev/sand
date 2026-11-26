import { type AppAsk, type AppOutput, type AppSession, type AppSetup, type Effort, type PlanLimits, RATE_LIMITED } from '@sand/accounts/contract'
import { appFailure, fieldsOf, forkedAside, type Json, mcpBlock, mcpBridge, parts, SERVER_NAME, Turns } from '@sand/app-plan'
import type { ModelContent, StopReason } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { errorMessage } from '@sand/util'
import { configOptions, effortOption, modelOption } from './account'
import type { AcpClient, startAcp } from './acp'
import { AGENT, asidePrompt, asideSetup } from './aside'
import { readLimits } from './limits'

interface SessionNeeds {
  media: Media
  folder?: string
  asides: string
  agent?: string
  report(limits: PlanLimits): void
  connect: typeof startAcp
}

interface Choosing {
  client: AcpClient
  sessionId: string
  created: Json
}

const HTTP_STATUS = /\b(?:HTTP|code) (\d{3})\b/
const RATE_LIMIT_TEXT = /rate limit|resource_exhausted/i
const QUOTA_TEXT = /quota reached|quota will reset|exhausted your capacity/i
const ALLOW = ['allow_always', 'allow_once']
const REJECT = ['reject_once', 'reject_always']

function stopReasonOf(raw: unknown): StopReason {
  return raw === 'max_tokens' ? 'max_tokens' : 'end_turn'
}

function systemPrompt(init: Json, system: string): Json {
  if (!system) return {}
  const capabilities = fieldsOf(init.agentCapabilities)
  if (fieldsOf(capabilities.sessionCapabilities).systemPrompt) return { systemPrompt: { mode: 'append', content: [{ type: 'text', text: system }] } }
  if (fieldsOf(fieldsOf(fieldsOf(capabilities._meta).antigravity).systemPrompt).append) return { _meta: { antigravity: { systemPrompt: { append: system } } } }
  return {}
}

function toolNameOf(name: string): string {
  return `mcp_${SERVER_NAME}_${name}`
}

function permissionOption(options: unknown, allow: boolean): string | undefined {
  const entries = Array.isArray(options) ? options.map(fieldsOf) : []
  const kinds = allow ? ALLOW : REJECT
  const found = kinds.flatMap(kind => entries.filter(option => option.kind === kind && typeof option.optionId === 'string'))[0]
  return found && String(found.optionId)
}

function usageOf(raw: Json) {
  return {
    input: Number(raw.inputTokens ?? raw.input_tokens ?? 0),
    output: Number(raw.outputTokens ?? raw.output_tokens ?? 0),
    cacheRead: Number(raw.cachedReadTokens ?? raw.cache_read_tokens ?? 0),
    cacheWrite: Number(raw.cachedWriteTokens ?? raw.cache_write_tokens ?? 0),
  }
}

function reportUsage(raw: Json, output: AppOutput) {
  const usage = usageOf(raw)
  if (usage.input || usage.output || usage.cacheRead || usage.cacheWrite) output.usage(usage)
}

function promptBlocks(content: ModelContent[], media: Media) {
  const blocks = parts(content, media).map(mcpBlock)
  return blocks.length ? blocks : [{ type: 'text', text: '' }]
}

async function chooseModel({ client, sessionId, created }: Choosing, model: string) {
  const option = modelOption(configOptions(created.configOptions))
  if (option) return client.request('session/set_config_option', { sessionId, configId: option.id, value: model })
  if (Array.isArray(fieldsOf(created.models).availableModels)) return client.request('session/set_model', { sessionId, modelId: model })
  return undefined
}

function statusOf(message: string): number | undefined {
  const found = HTTP_STATUS.exec(message)?.[1]
  if (found) return Number(found)
  return RATE_LIMIT_TEXT.test(message) || QUOTA_TEXT.test(message) ? RATE_LIMITED : undefined
}

async function rateLimited({ folder, report }: SessionNeeds, message: string) {
  const limits = await readLimits(folder).catch(() => undefined)
  if (limits) report(limits)
  return appFailure({ message, status: RATE_LIMITED, ...(QUOTA_TEXT.test(message) && { limited: {} }), limits })
}

async function failureOf(needs: SessionNeeds, error: unknown) {
  const message = errorMessage(error)
  const status = statusOf(message)
  if (status === RATE_LIMITED) return rateLimited(needs, message)
  return appFailure({ message, ...(status && { status }) })
}

function reportContext(raw: Json, output: AppOutput) {
  const window = Number(raw.size ?? 0)
  const used = Number(raw.used ?? 0)
  if (window || used) output.context({ ...(window && { window }), ...(used && { used }) })
}

async function openSession(setup: AppSetup, output: AppOutput, needs: SessionNeeds, resume?: string): Promise<AppSession> {
  const turns = new Turns(output)
  const sandTools = new Set(setup.tools.map(tool => toolNameOf(tool.name)))

  const bridge = setup.tools.length
    ? mcpBridge({
        tools: setup.tools,
        media: needs.media,
        call: ({ name, input }) => turns.call({ id: crypto.randomUUID(), name, input }),
      })
    : undefined

  function onNotify(method: string, params: Json) {
    if (method !== 'session/update') return
    const update = fieldsOf(params.update)
    const content = fieldsOf(update.content)
    const text = content.type === 'text' && typeof content.text === 'string' ? content.text : undefined
    if (update.sessionUpdate === 'agent_message_chunk' && text) output.text(text)
    if (update.sessionUpdate === 'agent_thought_chunk' && text) output.thinking(text)
    if (update.sessionUpdate === 'usage_update') reportContext(update, output)
  }

  async function onRequest(method: string, params: Json): Promise<unknown> {
    if (method !== 'session/request_permission') return {}
    const optionId = permissionOption(params.options, sandTools.has(String(fieldsOf(params.toolCall).name)))
    return { outcome: optionId ? { outcome: 'selected', optionId } : { outcome: 'cancelled' } }
  }

  const client = await needs.connect({
    folder: needs.folder,
    agent: needs.agent,
    cwd: setup.cwd,
    onNotify,
    onRequest,
    onExit: error => {
      bridge?.close()
      output.exit(error)
    },
  }).catch(error => {
    bridge?.close()
    throw error
  })

  const start = async () => {
    const common = { cwd: setup.cwd, mcpServers: bridge ? [bridge.server] : [], ...systemPrompt(client.init, setup.system) }
    const created = resume ? await client.request('session/resume', { ...common, sessionId: resume }) : await client.request('session/new', common)
    const sessionId = resume ?? String(created.sessionId ?? '')
    if (!sessionId) throw new Error('Antigravity did not return a session ID')
    await chooseModel({ client, sessionId, created }, setup.model)
    return { sessionId, effortId: effortOption(configOptions(created.configOptions))?.id }
  }

  const { sessionId, effortId } = await start().catch(async error => {
    bridge?.close()
    await client.close()
    throw error
  })

  let effort: Effort | undefined
  const chooseEffort = async (wanted?: Effort) => {
    if (!wanted || wanted === effort || !effortId) return
    effort = wanted
    await client.request('session/set_config_option', { sessionId, configId: effortId, value: wanted }).catch(() => {})
  }
  await chooseEffort(setup.effort)

  let latestPrompt = 0
  const runPrompt = async (content: ModelContent[], wanted?: Effort) => {
    const prompt = ++latestPrompt
    const superseded = () => prompt !== latestPrompt
    try {
      await chooseEffort(wanted)
      const result = await client.request('session/prompt', { sessionId, prompt: promptBlocks(content, needs.media) })
      reportUsage(fieldsOf(result.usage), output)
      if (!superseded()) turns.finish(stopReasonOf(result.stopReason))
    } catch (error) {
      if (!superseded()) turns.fail(turns.stopping ? error : await failureOf(needs, error))
    }
  }

  const aside = async (ask: AppAsk, signal?: AbortSignal) => {
    const asking = await asideSetup(setup, needs.asides)
    return forkedAside(output => openSession(asking, output, { ...needs, agent: AGENT }), asidePrompt(ask), signal)
  }

  return turns.session({
    id: sessionId,
    pid: client.pid,
    aside,
    prompt: (content, wanted) => void runPrompt(content, wanted),
    steer: content => void runPrompt(content),
    stop: () => client.notify('session/cancel', { sessionId }),
    async close() {
      await client.request('session/close', { sessionId }).catch(() => {})
      bridge?.close()
      await client.close()
    },
  })
}

export { openSession }
