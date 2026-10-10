import type { LLMRequest } from '../contract'
import type { ApiKey } from '../auth/store'
import { trimSlash } from '@sand/kit'
import { claudeBody, fastBeta, type ClaudeCall, type ClaudeSettings } from './request'

const defaultBase = 'https://api.anthropic.com'

const headers = (key: string, fast: boolean) => ({
  'content-type': 'application/json',
  'accept-encoding': 'identity',
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
  ...(fast && { 'anthropic-beta': fastBeta }),
})

export const keyCall = (credential: ApiKey, request: LLMRequest, settings: ClaudeSettings): ClaudeCall => ({
  url: `${trimSlash(credential.base_url ?? defaultBase)}/v1/messages`,
  payload: claudeBody(request, settings),
  headers: fast => headers(credential.key, fast),
  original: name => name,
})
