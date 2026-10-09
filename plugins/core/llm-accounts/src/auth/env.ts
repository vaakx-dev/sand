import type { LoginProvider } from '@sand/protocol'
import type { ApiKey } from './store'

export const envNames: Record<LoginProvider, string> = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY' }

export const envKey = (provider: LoginProvider): ApiKey | undefined => {
  const key = process.env[envNames[provider]]?.trim()
  return key ? { type: 'api_key', key } : undefined
}
