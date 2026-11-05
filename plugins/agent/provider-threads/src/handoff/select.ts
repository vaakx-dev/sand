import type { HandoffItem } from '@sand/accounts/contract'
import { handoffText, type Rendered } from './render'

export interface Selected {
  items: Rendered[]
  omitted: string[]
  context: string
}

const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value))

const responseItem = ({ role, text }: HandoffItem) => ({
  type: 'message',
  role,
  content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }],
})

const responseItems = (items: HandoffItem[], context: string) => [responseItem({ role: 'user', text: context }), ...items.map(responseItem)]

const historyCost = (items: HandoffItem[], context: string) => Math.max(bytes(responseItems(items, context)), bytes(handoffText(context, items))) + 256

const itemCost = (item: HandoffItem) => Math.max(bytes(responseItem(item)) + 1, bytes(item.text) + 4)

export const select = (items: Rendered[], coverage: (selected: number, omitted: number) => string, budget: number): Selected => {
  const chosen = new Set<number>()
  let remaining = budget - historyCost([], coverage(items.length, items.length))
  const add = (index: number) => {
    const item = items[index]
    if (!item || chosen.has(index)) return
    const cost = itemCost(item)
    if (cost > remaining) return
    chosen.add(index)
    remaining -= cost
  }
  add(items.findLastIndex(item => item.role === 'user'))
  add(items.findLastIndex(item => item.role === 'assistant'))
  add(items.findIndex(item => item.role === 'user'))
  for (let index = items.length - 1; index >= 0; index--) add(index)
  return {
    items: items.filter((_, index) => chosen.has(index)),
    omitted: items.flatMap((item, index) => (chosen.has(index) ? [] : [item.id])),
    context: coverage(chosen.size, items.length - chosen.size),
  }
}
