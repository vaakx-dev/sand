import type { Described } from './describe'

export const filters = ['conversation', 'prompts', 'labeled', 'everything'] as const

export type Filter = (typeof filters)[number]

export const filterNames: Record<Filter, string> = {
  conversation: 'Conversation',
  prompts: 'Prompts',
  labeled: 'Labeled',
  everything: 'Everything',
}

export const passes = (filter: Filter, described: Described, labeled: boolean) => {
  switch (filter) {
    case 'prompts':
      return described.kind === 'prompt'
    case 'labeled':
      return labeled
    case 'everything':
      return true
    default:
      return described.kind !== 'setting' && described.kind !== 'tools'
  }
}
