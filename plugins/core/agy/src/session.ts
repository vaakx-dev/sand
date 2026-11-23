import { type AppOutput, type AppSession, type AppSetup, type Effort, UsageLimited } from '@sand/accounts/contract'
import type { ModelContent, StopReason, ToolResultBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { findEffortOption, findModelOption, parseConfigOptions } from './account'
import { errorMessage, fieldsOf, startAcp, type Json } from './acp'
import { promptBlocks } from './content'
import { SERVER_NAME, startToolBridge } from './tools'

interface SessionNeeds {
  media: Media
  folder?: string
}

interface SessionConfigIds {
  modelConfigId?: string
  effortConfigId?: string
  legacyModels: boolean
}

function isRateLimitError(error: unknown): boolean {
  return /rate limit|quota|resource_exhausted|429/i.test(errorMessage(error))
}

function mapStopReason(raw: unknown): StopReason {
  if (raw === 'max_tokens') return 'max_tokens'
  return 'end_turn'
}

function configIdsFrom(session: Json): SessionConfigIds {
  const options = parseConfigOptions(session.configOptions)
  const modelOption = findModelOption(options)
  const effortOption = findEffortOption(options)
  const modelsField = fieldsOf(session.models)
  const legacyModels = !modelOption && Array.isArray(modelsField.availableModels)
  return {
    modelConfigId: modelOption?.id,
    effortConfigId: effortOption?.id,
    legacyModels,
  }
}

function systemPromptParams(init: Json, system: string): Json {
  if (!system) return {}
  const capabilities = fieldsOf(init.agentCapabilities)
  const sessionCaps = fieldsOf(capabilities.sessionCapabilities)
  if (sessionCaps.systemPrompt) {
    return { systemPrompt: { mode: 'append', content: [{ type: 'text', text: system }] } }
  }
  const antigravityMeta = fieldsOf(fieldsOf(capabilities._meta).antigravity)
  if (fieldsOf(antigravityMeta.systemPrompt).append) {
    return { _meta: { antigravity: { systemPrompt: { append: system } } } }
  }
  return {}
}

function agyToolName(name: string): string {
  return `mcp_${SERVER_NAME}_${name}`
}

function pickPermissionOption(options: unknown, allow: boolean): string | undefined {
  if (!Array.isArray(options)) return undefined
  const entries = options.map(fieldsOf)
  const preferred = allow ? ['allow_always', 'allow_once'] : ['reject_once', 'reject_always']
  for (const kind of preferred) {
    const found = entries.find(option => option.kind === kind && typeof option.optionId === 'string')
    if (found) return String(found.optionId)
  }
  return undefined
}

function reportUsage(raw: Json, output: AppOutput) {
  const input = Number(raw.inputTokens ?? raw.input_tokens ?? 0)
  const outputTokens = Number(raw.outputTokens ?? raw.output_tokens ?? 0)
  const cacheRead = Number(raw.cachedReadTokens ?? raw.cache_read_tokens ?? 0)
  const cacheWrite = Number(raw.cachedWriteTokens ?? raw.cache_write_tokens ?? 0)
  if (input || outputTokens || cacheRead || cacheWrite) {
    output.usage({ input, output: outputTokens, cacheRead, cacheWrite })
  }
}

async function openSession(setup: AppSetup, output: AppOutput, needs: SessionNeeds, resume?: string): Promise<AppSession> {
  const answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  const sandTools = new Set(setup.tools.map(tool => agyToolName(tool.name)))
  let running = false
  let stopped: PromiseWithResolvers<void> | undefined
  let currentEffort = setup.effort

  function answerFor(id: string): PromiseWithResolvers<ToolResultBlock> {
    const existing = answers.get(id)
    if (existing) return existing
    const created = Promise.withResolvers<ToolResultBlock>()
    answers.set(id, created)
    return created
  }

  function dropAnswers() {
    for (const entry of answers.values()) {
      entry.promise.catch(() => {})
      entry.reject(new Error('sand stopped this turn'))
    }
    answers.clear()
  }

  const bridge =
    setup.tools.length > 0
      ? startToolBridge(setup.tools, needs.media, async (name, input) => {
          const id = crypto.randomUUID()
          output.call({ id, name, input })
          output.pause()
          return answerFor(id).promise
        })
      : undefined

  function onNotify(method: string, params: Json) {
    if (method !== 'session/update') return
    const update = fieldsOf(params.update)
    const kind = update.sessionUpdate
    if (kind === 'agent_message_chunk') {
      const content = fieldsOf(update.content)
      if (content.type === 'text' && typeof content.text === 'string') output.text(content.text)
      return
    }
    if (kind === 'agent_thought_chunk') {
      const content = fieldsOf(update.content)
      if (content.type === 'text' && typeof content.text === 'string') output.thinking(content.text)
      return
    }
    if (kind === 'usage_update') {
      reportUsage(update, output)
    }
  }

  async function onRequest(method: string, params: Json): Promise<unknown> {
    if (method !== 'session/request_permission') return {}
    const allow = sandTools.has(String(fieldsOf(params.toolCall).name))
    const optionId = pickPermissionOption(params.options, allow)
    if (!optionId) return { outcome: { outcome: 'cancelled' } }
    return { outcome: { outcome: 'selected', optionId } }
  }

  const client = await startAcp({
    folder: needs.folder,
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

  let sessionId = ''
  let configIds: SessionConfigIds = { legacyModels: false }

  try {
    const init = await client.request('initialize', { protocolVersion: 1, clientCapabilities: {} })
    const commonParams: Json = {
      cwd: setup.cwd,
      mcpServers: bridge ? [bridge.mcpServer] : [],
      ...systemPromptParams(init, setup.system),
    }
    const created = resume
      ? await client.request('session/resume', { ...commonParams, sessionId: resume })
      : await client.request('session/new', commonParams)
    sessionId = resume ?? String(created.sessionId ?? '')
    if (!sessionId) throw new Error('Antigravity did not return a session ID')
    configIds = configIdsFrom(created)

    if (configIds.modelConfigId) {
      await client.request('session/set_config_option', { sessionId, configId: configIds.modelConfigId, value: setup.model })
    } else if (configIds.legacyModels) {
      await client.request('session/set_model', { sessionId, modelId: setup.model })
    }
    if (setup.effort && configIds.effortConfigId) {
      await client.request('session/set_config_option', { sessionId, configId: configIds.effortConfigId, value: setup.effort }).catch(() => {})
    }
  } catch (error) {
    bridge?.close()
    await client.close()
    throw error
  }

  async function runTurn(content: ModelContent[], effort?: Effort) {
    running = true
    try {
      if (effort && effort !== currentEffort && configIds.effortConfigId) {
        currentEffort = effort
        await client.request('session/set_config_option', { sessionId, configId: configIds.effortConfigId, value: effort }).catch(() => {})
      }
      const result = await client.request('session/prompt', { sessionId, prompt: promptBlocks(content, needs.media) })
      running = false
      reportUsage(fieldsOf(result.usage), output)
      if (stopped) {
        const waiting = stopped
        stopped = undefined
        waiting.resolve()
        return
      }
      output.finish(mapStopReason(result.stopReason))
    } catch (error) {
      running = false
      if (stopped) {
        const waiting = stopped
        stopped = undefined
        waiting.resolve()
        return
      }
      output.fail(isRateLimitError(error) ? new UsageLimited(errorMessage(error)) : error)
    }
  }

  return {
    id: sessionId,
    pid: client.pid,
    send(content: ModelContent[], effort?: Effort) {
      void runTurn(content, effort)
    },
    answer(id: string, result: ToolResultBlock) {
      answerFor(id).resolve(result)
    },
    interrupt() {
      dropAnswers()
      if (!running) return Promise.resolve()
      stopped ??= Promise.withResolvers<void>()
      client.notify('session/cancel', { sessionId })
      return stopped.promise
    },
    async close() {
      dropAnswers()
      await client.request('session/close', { sessionId }).catch(() => {})
      bridge?.close()
      await client.close()
    },
  }
}

export { openSession }
