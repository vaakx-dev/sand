import type { ApiKey } from './store'

export const envNames: Record<string, string> = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', openrouter: 'OPENROUTER_API_KEY' }

export const envKey = (id: string): ApiKey | undefined => {
  const name = envNames[id]
  const key = name ? process.env[name]?.trim() : undefined
  return key ? { type: 'api_key', key } : undefined
}
