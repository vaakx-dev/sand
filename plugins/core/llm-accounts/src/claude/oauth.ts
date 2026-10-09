import type { LLMRequest } from '../contract'
import { claudeBody, fastBeta, type ClaudeCall, type ClaudeSettings } from './request'
import { claudeCodeVersion, claudeSystem } from './system'
import { prefixTools } from './tools'

const url = 'https://api.anthropic.com/v1/messages?beta=true'
const betas = ['oauth-2025-04-20', 'interleaved-thinking-2025-05-14']

const headers = (access: string, fast: boolean) => ({
  'content-type': 'application/json',
  'accept-encoding': 'identity',
  authorization: `Bearer ${access}`,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': [...betas, ...(fast ? [fastBeta] : [])].join(','),
  'user-agent': `claude-cli/${claudeCodeVersion} (external, cli)`,
})

export const oauthCall = (access: string, request: LLMRequest, settings: ClaudeSettings): ClaudeCall => {
  const { payload, original } = prefixTools(claudeBody(request, settings))
  return {
    url,
    payload: { ...payload, system: claudeSystem(payload.system, payload.messages) },
    headers: fast => headers(access, fast),
    original,
  }
}
