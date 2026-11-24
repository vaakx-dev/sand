import type { AppStatus, PlanModel, SignInFlow } from '@sand/accounts/contract'
import { fieldsOf, levelsOf, textOf, type Json } from '@sand/app-plan'
import { capital } from '@sand/util'
import type { Pool } from '../server/pool'
import { limitsOf } from './limits'

const DEVICE_TIMEOUT_MS = 15 * 60_000

const planOf = (account: Json) => {
  if (account.type === 'apiKey') return 'API'
  const plan = textOf(account.planType)
  return plan && capital(plan)
}

const modelOf = (entry: Json): PlanModel[] => {
  const name = textOf(entry.model) ?? textOf(entry.id)
  if (!name || entry.hidden === true) return []
  const offered = Array.isArray(entry.supportedReasoningEfforts) ? entry.supportedReasoningEfforts.map(level => fieldsOf(level).reasoningEffort) : []
  return [
    {
      name,
      label: textOf(entry.displayName) ?? name,
      ...levelsOf(offered, entry.defaultReasoningEffort),
      images: Array.isArray(entry.inputModalities) && entry.inputModalities.includes('image'),
    },
  ]
}

export const codexAccount = (pool: Pool) => ({
  async status(): Promise<AppStatus> {
    const account = fieldsOf((await pool.request('account/read', {})).account)
    if (!account.type) return { installed: true, signedIn: false }
    const plan = planOf(account)
    return { installed: true, signedIn: true, ...(typeof account.email === 'string' && { email: account.email }), ...(plan && { plan }) }
  },

  async signIn(signal: AbortSignal): Promise<SignInFlow<void>> {
    const started = await pool.request('account/login/start', { type: 'chatgptDeviceCode' })
    const loginId = String(started.loginId)
    const done = Promise.withResolvers<void>()
    const stop = pool.listen((method, params) => {
      if (method !== 'account/login/completed' || params.loginId !== loginId) return
      if (params.success) done.resolve()
      else done.reject(new Error(typeof params.error === 'string' ? params.error : 'Codex sign-in failed'))
    })
    signal.addEventListener('abort', () => void pool.request('account/login/cancel', { loginId }).catch(() => {}), { once: true })
    const wait = () => done.promise.finally(stop)
    return { kind: 'device', url: String(started.verificationUrl), code: String(started.userCode), expires: Date.now() + DEVICE_TIMEOUT_MS, wait }
  },

  signOut: async () => {
    await pool.request('account/logout', {})
  },

  async models() {
    const { data } = await pool.request('model/list', { includeHidden: false })
    return (Array.isArray(data) ? data : []).map(fieldsOf).flatMap(modelOf)
  },

  usage: async () => limitsOf((await pool.request('account/rateLimits/read', {})).rateLimits),
})
