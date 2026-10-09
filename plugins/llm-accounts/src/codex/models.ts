import type { Effort, ModelInfo } from '@sand/protocol'

const upToMax: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const upToXhigh: Effort[] = ['low', 'medium', 'high', 'xhigh']

export const codexModels = [
  'gpt-6.1-sol',
  'gpt-6-sol',
  'gpt-6-astra',
  'gpt-6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-5.3-codex-spark',
]

const textOnly = new Set(['gpt-5.3-codex-spark'])

const label = (id: string) =>
  id
    .split('-')
    .map((part, index) => (index === 0 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
    .replace(/^GPT /, 'GPT-')

const effortsOf = (id: string) => (/^gpt-(6|5\.6)/.test(id) ? upToMax : upToXhigh)

export const describeCodex = (id: string): ModelInfo => ({
  id,
  provider: 'openai',
  label: label(id),
  efforts: effortsOf(id),
  defaultEffort: 'medium',
  context: id.includes('spark') ? 128_000 : 272_000,
})

export const takesImages = (id: string) => !textOnly.has(id)
