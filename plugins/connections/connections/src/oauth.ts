import { z } from 'zod'
import type { Authorized, Client, OAuth } from './contract'
import type { Tokens } from './vault'

export class TokenError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

const answer = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.coerce.number().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const randomText = (bytes: number) => Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url')

export const challengeOf = async (verifier: string) =>
  Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url')

const parsed = async (response: Response) => {
  const found = answer.safeParse(await response.json().catch(() => undefined))
  return found.success ? found.data : {}
}

const tokenRequest = async (oauth: OAuth, client: Client, params: Record<string, string>, signal: AbortSignal): Promise<Tokens> => {
  const response = await fetch(oauth.token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ ...params, client_id: client.id, ...(client.secret && { client_secret: client.secret }) }),
    signal,
  })
  const body = await parsed(response)
  if (!response.ok || !body.access_token)
    throw new TokenError(body.error ?? `http_${response.status}`, body.error_description ?? body.error ?? `${new URL(oauth.token).host} answered HTTP ${response.status}`)
  return {
    access: body.access_token,
    ...(body.refresh_token && { refresh: body.refresh_token }),
    ...(body.expires_in && { expires: Date.now() + body.expires_in * 1000 }),
  }
}

export const authorizeUrl = (oauth: OAuth, client: Client, input: { redirect: string; state: string; challenge: string; readOnly: boolean }) => {
  const url = new URL(oauth.authorize)
  const scopes = input.readOnly && oauth.readOnlyScopes ? oauth.readOnlyScopes : oauth.scopes
  const params = {
    client_id: client.id,
    redirect_uri: input.redirect,
    response_type: 'code',
    scope: scopes.join(' '),
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    ...oauth.params,
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.href
}

export const exchange = (oauth: OAuth, client: Client, input: { code: string; verifier: string; redirect: string }, signal: AbortSignal) =>
  tokenRequest(oauth, client, { grant_type: 'authorization_code', code: input.code, code_verifier: input.verifier, redirect_uri: input.redirect }, signal)

export const refresh = async (oauth: OAuth, client: Client, tokens: Tokens): Promise<Tokens> => {
  if (!tokens.refresh) throw new TokenError('invalid_grant', 'The sign-in expired')
  const next = await tokenRequest(oauth, client, { grant_type: 'refresh_token', refresh_token: tokens.refresh }, AbortSignal.timeout(30_000))
  return { refresh: tokens.refresh, ...next }
}

export const bearer =
  (access: string): Authorized =>
  (url, init) => {
    const headers = new Headers(init?.headers)
    headers.set('authorization', `Bearer ${access}`)
    return fetch(url, { ...init, headers })
  }
