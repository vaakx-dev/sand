import type { Item, ToolView } from '@sand/transcript/contract'
import { plural } from '@sand/util'

type Kind = 'read' | 'edit' | 'write' | 'search' | 'shell' | 'test' | 'build' | 'web' | 'helper' | 'skill' | 'page'

const kinds: Record<string, Kind> = {
  read: 'read',
  outline: 'read',
  where: 'read',
  edit: 'edit',
  patch: 'edit',
  move: 'edit',
  delete: 'edit',
  write: 'write',
  grep: 'search',
  search: 'search',
  glob: 'search',
  find: 'search',
  shell: 'shell',
  run: 'shell',
  build: 'build',
  test: 'test',
  web: 'web',
  helper: 'helper',
  helpers: 'helper',
  ask: 'helper',
  skill: 'skill',
  html: 'page',
}

const times = (count: number) => (count === 1 ? 'once' : `${count} times`)

const phrases: Record<Kind, (count: number) => string> = {
  read: count => `read ${plural(count, 'file')}`,
  edit: count => `edited ${plural(count, 'file')}`,
  write: count => `wrote ${plural(count, 'file')}`,
  search: count => `searched ${times(count)}`,
  shell: count => `ran ${plural(count, 'command')}`,
  test: () => 'ran tests',
  build: () => 'built',
  web: count => `searched the web ${times(count)}`,
  helper: count => `asked ${plural(count, 'helper')}`,
  skill: count => `used ${plural(count, 'skill')}`,
  page: count => `drew ${plural(count, 'page')}`,
}

const shown = 3

const commandOf = (input: unknown) => (typeof input === 'object' && input && 'command' in input && typeof input.command === 'string' ? input.command : '')

const kindOf = ({ call }: ToolView): Kind | undefined => {
  const plain = call.name.replace(/^mcp_/, '').toLowerCase()
  const kind = kinds[plain] ?? kinds[plain.split(/[_\-.]/)[0] ?? plain]
  return kind === 'shell' && /\btest\b/.test(commandOf(call.input)) ? 'test' : kind
}

const toolsIn = (work: Item[]): ToolView[] =>
  work.flatMap(item => (item.kind === 'tools' ? item.steps.flatMap(step => (step.kind === 'tool' ? [step.tool] : [])) : []))

export const summaryOf = (work: Item[]) => {
  const counts = new Map<Kind, number>()
  for (const tool of toolsIn(work)) {
    const kind = kindOf(tool)
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return [...counts]
    .slice(0, shown)
    .map(([kind, count]) => phrases[kind](count))
    .join(', ')
}
