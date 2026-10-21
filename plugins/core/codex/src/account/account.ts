import type { AppStatus, Effort, PlanModel, SignInFlow } from '@sand/accounts/contract'
import { capital } from '@sand/util'
import { findCodex } from '../server/binary'
import { fieldsOf, type Json } from '../server/rpc'
import type { CodexServer } from '../server/server'
import { limitsOf } from './limits'

const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const deviceTimeout = 15 * 60_000

const planOf = (account: Json) => {
  if (account.type === 'apiKey') return 'API'
  return typeof account.planType === 'string' && account.planType ? capital(account.planType) : undefined
}

const modelOf = (entry: Json): PlanModel[] => {
  const name = entry.model ?? entry.id
  if (typeof name !== 'string' || !name || entry.hidden === true) return []
  const levels = Array.isArray(entry.supportedReasoningEfforts) ? entry.supportedReasoningEfforts.map(level => fieldsOf(level).reasoningEffort) : []
  const supported = efforts.filter(effort => levels.includes(effort))
  const defaultEffort = supported.find(effort => effort === entry.defaultReasoningEffort)
  return [
    {
      name,
      label: typeof entry.displayName === 'string' && entry.displayName ? entry.displayName : name,
      ...(supported.length && { efforts: supported }),
      ...(defaultEffort && { defaultEffort }),
      images: Array.isArray(entry.inputModalities) && entry.inputModalities.includes('image'),
    },
  ]
}

export const codexAccount = (server: CodexServer) => ({
  async status(): Promise<AppStatus> {
    if (!(await findCodex())) return { installed: false, signedIn: false }
    const account = fieldsOf((await server.request('account/read', {})).account)
    if (!account.type) return { installed: true, signedIn: false }
    const plan = planOf(account)
    return { installed: true, signedIn: true, ...(typeof account.email === 'string' && { email: account.email }), ...(plan && { plan }) }
  },

  async signIn(signal: AbortSignal): Promise<SignInFlow<void>> {
    const started = await server.request('account/login/start', { type: 'chatgptDeviceCode' })
    const loginId = String(started.loginId)
    const done = Promise.withResolvers<void>()
    const stop = server.listen((method, params) => {
      if (method !== 'account/login/completed' || params.loginId !== loginId) return
      if (params.success) done.resolve()
      else done.reject(new Error(typeof params.error === 'string' ? params.error : 'Codex sign-in failed'))
    })
    signal.addEventListener('abort', () => void server.request('account/login/cancel', { loginId }).catch(() => {}), { once: true })
    const wait = () => done.promise.finally(stop)
    return { kind: 'device', url: String(started.verificationUrl), code: String(started.userCode), expires: Date.now() + deviceTimeout, wait }
  },

  signOut: async () => {
    await server.request('account/logout', {})
  },

  async models() {
    const { data } = await server.request('model/list', { includeHidden: false })
    return (Array.isArray(data) ? data : []).map(fieldsOf).flatMap(modelOf)
  },

  usage: async () => limitsOf((await server.request('account/rateLimits/read', {})).rateLimits),
})
