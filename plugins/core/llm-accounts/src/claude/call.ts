import type { LLMRequest } from '../contract'
import type { ApiKey, Credential } from '../auth/store'
import { trimSlash } from '@sand/kit'
import { claudeBody, type ClaudeSettings } from './body'
import { claudeSystem, claudeUserAgent } from './system'
import { prefixTools } from './tools'

export type Payload = Record<string, unknown>

export interface ClaudeCall {
  url: string
  payload: Payload
  headers(fast: boolean): Record<string, string>
  original(name: string): string
}

const fastBeta = 'fast-mode-2026-02-01'
const keyBase = 'https://api.anthropic.com'
const oauthUrl = 'https://api.anthropic.com/v1/messages?beta=true'
const oauthBetas = ['oauth-2025-04-20', 'interleaved-thinking-2025-05-14']

const keyHeaders = (key: string, fast: boolean) => ({
  'content-type': 'application/json',
  'accept-encoding': 'identity',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
  ...(fast && { 'anthropic-beta': fastBeta }),
})

const oauthHeaders = (access: string, fast: boolean) => ({
  'content-type': 'application/json',
  'accept-encoding': 'identity',
  authorization: `Bearer ${access}`,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': [...oauthBetas, ...(fast ? [fastBeta] : [])].join(','),
  'user-agent': claudeUserAgent,
})

const keyCall = (credential: ApiKey, request: LLMRequest, settings: ClaudeSettings): ClaudeCall => ({
  url: `${trimSlash(credential.base_url ?? keyBase)}/v1/messages`,
  payload: claudeBody(request, settings, !credential.base_url),
  headers: fast => keyHeaders(credential.key, fast),
  original: name => name,
})

const oauthCall = (access: string, request: LLMRequest, settings: ClaudeSettings): ClaudeCall => {
  const { payload, original } = prefixTools(claudeBody(request, settings, true))
  return {
    url: oauthUrl,
    payload: { ...payload, system: claudeSystem(payload.system, payload.messages) },
    headers: fast => oauthHeaders(access, fast),
    original,
  }
}

export const claudeCall = (credential: Credential, request: LLMRequest, settings: ClaudeSettings) =>
  credential.type === 'oauth' ? oauthCall(credential.access, request, settings) : keyCall(credential, request, settings)
