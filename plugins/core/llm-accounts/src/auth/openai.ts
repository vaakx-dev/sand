import { capital, untilAborted } from '@sand/kit'
import { fieldsOf, isText, jwtClaims, type Json } from './json'
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

interface Device {
  id: string
  code: string
  interval: number
}

const tokensOf = (json: Json): Tokens => {
  const access = required(json.access_token, 'access_token')
  const claims = jwtClaims(access)
  const identity = jwtClaims(json.id_token)
  const auth = fieldsOf(claims[authClaim])
  const identityAuth = fieldsOf(identity[authClaim])
  const accountId = auth.chatgpt_account_id ?? identityAuth.chatgpt_account_id
  if (!isText(accountId)) throw new Error('The ChatGPT token has no account id')
  const email = identity.email ?? fieldsOf(claims[profileClaim]).email
  const plan = auth.chatgpt_plan_type ?? identityAuth.chatgpt_plan_type
  return {
    access,
    refresh: required(json.refresh_token, 'refresh_token'),
    expires: expiresAt(json.expires_in),
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

const postJson = (url: string, body: Json, signal: AbortSignal) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })

export const startDevice = async (signal: AbortSignal): Promise<Device> => {
  const response = await postJson(userCodeUrl, { client_id: clientId }, signal)
  if (!response.ok) throw new Error(`ChatGPT device sign-in failed (${response.status}): ${await response.text().catch(() => '')}`)
  const json = fieldsOf(await response.json())
  const interval = Number(json.interval ?? 5)
  const { device_auth_id: id, user_code: code } = json
  if (!isText(id) || !isText(code) || !Number.isFinite(interval)) throw new Error('ChatGPT sent an invalid device code')
  return { id, code, interval: Math.max(1, interval) }
}

const errorCode = (text: string) => {
  try {
    const { error } = fieldsOf(JSON.parse(text))
    return typeof error === 'object' ? fieldsOf(error).code : error
  } catch {}
}

const pollOnce = async (device: Device, signal: AbortSignal) => {
  const response = await postJson(deviceTokenUrl, { device_auth_id: device.id, user_code: device.code }, signal)
  if (response.ok) {
    const { authorization_code: code, code_verifier: verifier } = fieldsOf(await response.json())
    if (!isText(code) || !isText(verifier)) throw new Error('ChatGPT sent an invalid device token')
    return { code, verifier }
  }
  if (response.status === 403 || response.status === 404) return 'pending'
  const text = await response.text().catch(() => '')
  const code = errorCode(text)
  if (code === 'deviceauth_authorization_pending') return 'pending'
  if (code === 'slow_down') return 'slow'
  throw new Error(`ChatGPT sign-in failed (${response.status}): ${text}`)
}

export const pollDevice = async (device: Device, deadline: number, signal: AbortSignal): Promise<Tokens> => {
  let interval = device.interval * 1000
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const result = await pollOnce(device, signal)
    if (result === 'slow') interval += 5000
    else if (result !== 'pending') {
      const fields = { grant_type: 'authorization_code', client_id: clientId, code: result.code, code_verifier: result.verifier, redirect_uri: deviceRedirect }
      return tokensOf(await postToken(tokenUrl, form(fields, signal)))
    }
    await untilAborted(Bun.sleep(Math.min(interval, Math.max(0, deadline - Date.now()))), signal)
  }
  throw new Error('The sign-in code expired. Start again.')
}

export const refreshOpenAI = async (tokens: Tokens): Promise<Tokens> => {
  const json = await postToken(tokenUrl, form({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: clientId }))
  return { ...tokens, ...tokensOf(json) }
}
