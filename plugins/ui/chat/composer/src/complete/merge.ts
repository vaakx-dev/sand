import { capital } from '@sand/util'
import type { Trigger, TriggerItem } from '../contract'

export interface Found {
  trigger: Trigger
  items: TriggerItem[]
}

export interface Suggestion {
  trigger: Trigger
  item: TriggerItem
  group: string
}

export const merged = (found: Found[], perGroup: number, total: number): Suggestion[] =>
  found.flatMap(({ trigger, items }) => items.slice(0, perGroup).map(item => ({ trigger, item, group: capital(trigger.label) }))).slice(0, total)

export const noMatch = (triggers: Trigger[]) => `No matching ${triggers.map(trigger => trigger.label).join(' or ')}.`
