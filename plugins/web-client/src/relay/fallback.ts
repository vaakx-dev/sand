import type { Picker } from '@sand/protocol'

export const promptPicker: Picker = {
  async choose(title, items, options) {
    const lines = items.map((item, index) => `${index + 1}. ${item.label}${item.detail ? ` — ${item.detail}` : ''}`)
    const answer = window.prompt(`${title}\n\n${lines.join('\n')}`, String((options?.selected ?? 0) + 1))
    const item = answer === null ? undefined : items[Number(answer) - 1]
    return item ? { value: item.value, query: '' } : undefined
  },
  input: async (title, value) => window.prompt(title, value ?? '') ?? undefined,
}
