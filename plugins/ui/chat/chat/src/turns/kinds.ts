import type { Item, ToolView } from '../parts/contract'

const words: Record<string, string> = {
  read: 'Read',
  outline: 'Read',
  where: 'Read',
  edit: 'Edit',
  patch: 'Edit',
  move: 'Edit',
  delete: 'Edit',
  write: 'Write',
  grep: 'Search',
  search: 'Search',
  glob: 'Find',
  find: 'Find',
  shell: 'Shell',
  run: 'Shell',
  build: 'Build',
  test: 'Test',
  screenshot: 'Screenshot',
  export: 'Export',
  web: 'Web',
  thread: 'Thread',
  threads: 'Thread',
  helper: 'Helper',
  helpers: 'Helper',
  ask: 'Helper',
  skill: 'Skill',
  html: 'Page',
  find_tools: 'Tools',
}

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

const kindOf = (name: string) => {
  const plain = name.replace(/^mcp_/, '').toLowerCase()
  const first = plain.split(/[_\-.]/)[0] ?? plain
  return words[plain] ?? words[first] ?? capital(first)
}

const toolsIn = (work: Item[]): ToolView[] =>
  work.flatMap(item => (item.kind === 'tools' ? item.steps.flatMap(step => (step.kind === 'tool' ? [step.tool] : [])) : []))

export const kindsIn = (work: Item[]) => [...new Set(toolsIn(work).map(tool => kindOf(tool.call.name)))]

export const currentKind = (work: Item[]) => {
  const last = toolsIn(work).at(-1)
  return last && kindOf(last.call.name)
}
