import type { Effort, ModelInfo } from '@sand/protocol'

const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const claudeModels = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']

const known: Record<string, Omit<ModelInfo, 'id'>> = {
  'claude-fable-5-1': { label: 'Fable 5.1', efforts, defaultEffort: 'high', context: 1_000_000 },
  'claude-opus-5-5': { label: 'Opus 5.5', efforts, defaultEffort: 'medium', context: 1_000_000, fast: true },
  'claude-sonnet-5-5': { label: 'Sonnet 5.5', efforts, defaultEffort: 'high', context: 1_000_000 },
  'claude-haiku-5-5': { label: 'Haiku 5.5', efforts, defaultEffort: 'medium', context: 100_000 },
}

const fastModels = new Set(['claude-opus-5', 'claude-opus-4-8'])

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

const label = (id: string) => {
  const [family = id, ...version] = id.replace(/^claude-/, '').split('-')
  return [capital(family), version.join('.')].filter(Boolean).join(' ')
}

const guess = (id: string): Omit<ModelInfo, 'id'> =>
  id.includes('haiku') ? { label: label(id), efforts: [] } : { label: label(id), efforts, defaultEffort: 'high', fast: fastModels.has(id) }

export const describeClaude = (id: string): ModelInfo => ({ id, provider: 'anthropic', ...(known[id] ?? guess(id)) })
