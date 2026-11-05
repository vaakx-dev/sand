import { capital } from '@sand/util'
import type { Trigger, TriggerItem } from '../contract'
import type { Source } from './registry'

export interface Found {
  trigger: Source
  items: TriggerItem[]
}

export interface Suggestion {
  trigger: Source
  item: TriggerItem
  group: string
}

export const merged = (found: Found[], perGroup: number, total: number): Suggestion[] =>
  found.flatMap(({ trigger, items }) => items.slice(0, perGroup).map(item => ({ trigger, item, group: capital(trigger.label) }))).slice(0, total)

export const noMatch = (triggers: Trigger[]) => `No matching ${triggers.map(trigger => trigger.label).join(' or ')}.`

export type Group = TriggerItem[] | undefined

export const firstItem = (groups: Group[]): 'loading' | 'found' | 'none' => {
  for (const items of groups) {
    if (!items) return 'loading'
    if (items.length) return 'found'
  }
  return 'none'
}
