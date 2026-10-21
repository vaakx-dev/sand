import type { Session } from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'
import type { LLM, LLMEvent, Limits } from './llm'
import type { DetectedServer, LoginState } from './login'
import type { ModelInfo } from './models'
import type { Plans } from './plans'
import type { ModelSetup } from './setup'

export type * from './live'
export type * from './llm'
export type * from './login'
export type * from './models'
export type * from './plans'
export type * from './setup'
export type * from './usage'

export const llm = service<LLM>('llm')
export const llmPlans = service<Plans>('llmPlans')
export const modelSetup = service<ModelSetup>('modelSetup')

export const llmEvent = event<(event: LLMEvent, session: Session) => void>('llm.event')
export const llmLimits = event<(limits: Limits) => void>('llm.limits')
export const llmModels = event<() => void>('llm.models')

export const llmLimitsWire = wireEvent<Limits>('llm.limits')
export const loginChange = wireEvent<LoginState>('login.change')

export const helloLimits = helloField<Limits>('limits')

const account = z.object({ account: z.string() })
const source = z.object({ source: z.string() })
const model = z.object({ model: z.string() })
const login = type<LoginState>()

export const limitsRefresh = request('limits.refresh', { input: z.object({}), output: type<Limits | undefined>() })

export const loginStatus = request('login.status', { input: z.object({}), output: login })
export const loginStart = request('login.start', { input: account.extend({ anyway: z.boolean().optional() }), output: login })
export const loginFinish = request('login.finish', { input: account.extend({ code: z.string() }), output: login })
export const loginKey = request('login.key', {
  input: z.object({ account: z.enum(['anthropic', 'openai', 'openrouter']), key: z.string(), baseUrl: z.string().optional() }),
  output: login,
})
export const loginServer = request('login.server', {
  input: z.object({
    id: z.string().optional(),
    name: z.string(),
    url: z.string(),
    key: z.string().optional(),
    provider: z.enum(['ollama', 'lmstudio', 'server']).optional(),
  }),
  output: login,
})
export const loginDetect = request('login.detect', { input: z.object({}), output: type<DetectedServer[]>() })
export const loginCancel = request('login.cancel', { input: account, output: login })
export const loginLogout = request('login.logout', { input: account, output: login })
export const loginShared = request('login.shared', { input: account.extend({ shared: z.boolean() }), output: login })

export const modelsCatalog = request('models.catalog', { input: source, output: type<ModelInfo[]>() })
export const modelsPref = request('models.pref', {
  input: model.extend({ hidden: z.boolean().optional(), favourite: z.boolean().optional() }),
  output: type<void>(),
})
export const modelsAdd = request('models.add', { input: source.extend({ name: z.string() }), output: type<ModelInfo>() })
export const modelsRemove = request('models.remove', { input: model, output: type<void>() })
export const modelsNewModels = request('models.newModels', { input: source.extend({ mode: z.enum(['show', 'hide']) }), output: type<void>() })
export const modelsSeen = request('models.seen', { input: source, output: type<void>() })
export const modelsRefresh = request('models.refresh', { input: z.object({ source: z.string().optional() }), output: type<void>() })
