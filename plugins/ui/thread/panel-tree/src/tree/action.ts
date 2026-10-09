import type { ToolCallBlock } from '@sand/protocol'
import { oneLine, tildeHome } from '@sand/kit'

export interface ToolAction {
  verb: string
  target: string
}

const verbs: Record<string, [verb: string, fields: string[]]> = {
  shell: ['Ran', ['command']],
  read: ['Read', ['path']],
  edit: ['Edited', ['path']],
  write: ['Wrote', ['path']],
  grep: ['Searched', ['pattern']],
  glob: ['Listed', ['pattern']],
  agent: ['Agent', ['label', 'task']],
  workflow: ['Workflow', ['label', 'resume']],
  skill: ['Skill', ['name']],
}

const capitalized = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

const summary = (input: Record<string, unknown>) =>
  Object.values(input)
    .map(value => (typeof value === 'string' ? value : JSON.stringify(value)))
    .join(' ')

export const toolAction = (call: ToolCallBlock): ToolAction => {
  const [verb, fields] = verbs[call.name] ?? [capitalized(call.name), []]
  const input = typeof call.input === 'object' && call.input ? (call.input as Record<string, unknown>) : {}
  const named = fields.map(field => input[field]).find((value): value is string => typeof value === 'string' && value.trim() !== '')
  return { verb, target: oneLine(tildeHome(named ?? summary(input)), 160) }
}

export const actionsText = (actions: ToolAction[]) => {
  const [first, ...rest] = actions
  if (!first) return { who: 'Tools', text: '' }
  return { who: first.verb, text: rest.length ? `${first.target} (+${rest.length} more)` : first.target }
}
