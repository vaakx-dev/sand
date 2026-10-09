import { jwtClaims } from './jwt'
import { expiresAt, postToken, required } from './request'
import type { Tokens } from './store'

const clientId = 'app_EMoamEEZ73f0CkXaXp7hrann'
const base = 'https://auth.openai.com'
const tokenUrl = `${base}/oauth/token`
const userCodeUrl = `${base}/api/accounts/deviceauth/usercode`
const deviceTokenUrl = `${base}/api/accounts/deviceauth/token`
const deviceRedirect = `${base}/deviceauth/callback`
export const deviceUrl = `${base}/codex/device`
export const deviceTimeout = 15 * 60_000
const authClaim = 'https://api.openai.com/auth'
const profileClaim = 'https://api.openai.com/profile'

export interface Device {
  id: string
  code: string
  interval: number
}

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

const tokensOf = (json: any): Tokens => {
  const access = required(json?.access_token, 'access_token')
  const claims = jwtClaims(access)
  const identity = jwtClaims(json?.id_token)
  const accountId = claims[authClaim]?.chatgpt_account_id ?? identity[authClaim]?.chatgpt_account_id
  if (typeof accountId !== 'string' || !accountId) throw new Error('The ChatGPT token has no account id')
  const email = identity.email ?? claims[profileClaim]?.email
  const plan = claims[authClaim]?.chatgpt_plan_type ?? identity[authClaim]?.chatgpt_plan_type
  return {
    access,
    refresh: required(json?.refresh_token, 'refresh_token'),
    expires: expiresAt(json?.expires_in),
    accountId,
    ...(typeof email === 'string' && { email }),
    ...(typeof plan === 'string' && { plan: capital(plan) }),
  }
}

const form = (fields: Record<string, string>, signal?: AbortSignal): RequestInit => ({
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields),
  signal,
})

export const startDevice = async (signal: AbortSignal): Promise<Device> => {
  const response = await fetch(userCodeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
    signal,
  })
  if (!response.ok) throw new Error(`ChatGPT device sign-in failed (${response.status}): ${await response.text().catch(() => '')}`)
  const json = (await response.json()) as any
  const interval = Number(json?.interval ?? 5)
  if (!json?.device_auth_id || !json.user_code || !Number.isFinite(interval)) throw new Error('ChatGPT sent an invalid device code')
  return { id: json.device_auth_id, code: json.user_code, interval: Math.max(1, interval) }
}

const errorCode = (text: string) => {
  try {
    const { error } = JSON.parse(text)
    return typeof error === 'object' ? error?.code : error
  } catch {}
}

const pollOnce = async (device: Device, signal: AbortSignal) => {
  const response = await fetch(deviceTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_auth_id: device.id, user_code: device.code }),
    signal,
  })
  if (response.ok) {
    const json = (await response.json()) as any
    if (!json?.authorization_code || !json.code_verifier) throw new Error('ChatGPT sent an invalid device token')
    return { code: json.authorization_code as string, verifier: json.code_verifier as string }
  }
  if (response.status === 403 || response.status === 404) return 'pending'
  const text = await response.text().catch(() => '')
  const code = errorCode(text)
  if (code === 'deviceauth_authorization_pending') return 'pending'
  if (code === 'slow_down') return 'slow'
  throw new Error(`ChatGPT sign-in failed (${response.status}): ${text}`)
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new Error('Sign-in cancelled'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })

export const pollDevice = async (device: Device, deadline: number, signal: AbortSignal): Promise<Tokens> => {
  let interval = device.interval * 1000
  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Sign-in cancelled')
    const result = await pollOnce(device, signal)
    if (result === 'slow') interval += 5000
    else if (result !== 'pending') {
      const json = await postToken(
        tokenUrl,
        form({ grant_type: 'authorization_code', client_id: clientId, code: result.code, code_verifier: result.verifier, redirect_uri: deviceRedirect }, signal),
      )
      return tokensOf(json)
    }
    await wait(Math.min(interval, Math.max(0, deadline - Date.now())), signal)
  }
  throw new Error('The sign-in code expired. Start again.')
}

export const refreshOpenAI = async (tokens: Tokens): Promise<Tokens> => {
  const json = await postToken(tokenUrl, form({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: clientId }))
  return { ...tokens, ...tokensOf(json) }
}
