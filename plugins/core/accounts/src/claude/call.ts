import type { LLMRequest, PlanCall } from '../contract'
import type { Media } from '@sand/media/contract'
import type { ApiKey } from '../auth/store'
import { trimSlash } from '@sand/util'
import { claudeBody, type ClaudeSettings } from './body'

const fastBeta = 'fast-mode-2026-02-01'
const keyBase = 'https://api.anthropic.com'

const keyHeaders = (key: string, fast: boolean) => ({
  'content-type': 'application/json',
  'accept-encoding': 'identity',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
  ...(fast && { 'anthropic-beta': fastBeta }),
})

export const keyCall = (credential: ApiKey, request: LLMRequest, settings: ClaudeSettings, media: Media): PlanCall => ({
  url: `${trimSlash(credential.base_url ?? keyBase)}/v1/messages`,
  payload: claudeBody(request, settings, !credential.base_url, media),
  headers: fast => keyHeaders(credential.key, fast),
})
