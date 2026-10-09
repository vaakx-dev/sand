import { pkce } from './pkce'
import { expiresAt, postToken, required } from './request'
import type { Tokens } from './store'

const clientId = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const authorizeUrl = 'https://claude.ai/oauth/authorize'
const redirectUri = 'https://platform.claude.com/oauth/code/callback'
const tokenUrl = 'https://platform.claude.com/v1/oauth/token'
const profileUrl = 'https://api.anthropic.com/api/oauth/profile'
const scopes = ['org:create_api_key', 'user:profile', 'user:inference', 'user:sessions:claude_code', 'user:mcp_servers', 'user:file_upload']

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'axios/1.13.6',
}

export interface ClaudeFlow {
  url: string
  verifier: string
  state: string
}

export const authorizeClaude = async (): Promise<ClaudeFlow> => {
  const { verifier, challenge } = await pkce()
  const state = crypto.randomUUID().replace(/-/g, '')
  const url = new URL(authorizeUrl)
  url.searchParams.set('code', 'true')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', scopes.join(' '))
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  return { url: url.toString(), verifier, state }
}

const parsePasted = (input: string) => {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (code && state) return { code, state }
  } catch {}
  const [code, state, ...rest] = trimmed.split('#')
  if (code && state && !rest.length) return { code, state }
  const params = new URLSearchParams(trimmed)
  const paramCode = params.get('code')
  const paramState = params.get('state')
  return paramCode && paramState ? { code: paramCode, state: paramState } : undefined
}

const plans: Record<string, string> = { claude_max: 'Max', claude_pro: 'Pro', claude_team: 'Team', claude_enterprise: 'Enterprise' }

const profile = async (access: string): Promise<Pick<Tokens, 'email' | 'plan'>> => {
  try {
    const response = await fetch(profileUrl, { headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' } })
    if (!response.ok) return {}
    const { account, organization } = (await response.json()) as any
    const plan = plans[organization?.organization_type] ?? (account?.has_claude_max ? 'Max' : account?.has_claude_pro ? 'Pro' : undefined)
    return { ...(account?.email && { email: account.email }), ...(plan && { plan }) }
  } catch {
    return {}
  }
}

const tokensOf = (json: any): Tokens => ({
  access: required(json?.access_token, 'access_token'),
  refresh: required(json?.refresh_token, 'refresh_token'),
  expires: expiresAt(json?.expires_in),
  ...(json?.account?.email_address && { email: json.account.email_address }),
})

export const exchangeClaude = async (pasted: string, flow: ClaudeFlow): Promise<Tokens> => {
  const callback = parsePasted(pasted)
  if (!callback) throw new Error('Paste the whole code shown after signing in (it looks like code#state)')
  if (callback.state !== flow.state) throw new Error('This code belongs to an older sign-in. Start again and paste the new code.')
  const json = await postToken(tokenUrl, {
    headers,
    body: JSON.stringify({
      code: callback.code,
      state: callback.state,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: flow.verifier,
    }),
  })
  const tokens = tokensOf(json)
  return { ...tokens, ...(await profile(tokens.access)) }
}

export const refreshClaude = async (tokens: Tokens): Promise<Tokens> => {
  const json = await postToken(tokenUrl, {
    headers,
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: clientId }),
  })
  return { ...tokens, ...tokensOf(json) }
}
