import type { UiElement } from '@sand/computers/contract'

export type TaskSet = 'browser' | 'desktop'

export type Place = 'local' | 'web' | 'account' | 'app'

export const kinds = {
  basic: 'Simple lookups and forms',
  flow: 'Long multi-step flows',
  scroll: 'Scrolling inside a widget',
  drag: 'Drag and drop',
  menu: 'Nested and right-click menus',
  picker: 'Date pickers and custom dropdowns',
  interrupt: 'Popups that interrupt',
  tiny: 'Tiny or unlabeled targets',
  embedded: 'Iframes and canvas',
  tabs: 'Comparing across tabs',
  recovery: 'Recovering from a wrong click',
  gesture: 'Press-and-hold and multi-select',
  app: 'Desktop app navigation',
} as const

export type Kind = keyof typeof kinds

export interface Tab {
  url: string
  title: string
  text: string
  fields: Record<string, string | boolean>
}

export interface Verdict {
  pass: boolean
  why: string
}

export interface Seen {
  answer: string
  tabs: Tab[]
  elements: UiElement[]
  judge(goal: string): Promise<Verdict>
}

export interface Task {
  id: string
  set: TaskSet
  place: Place
  kind: Kind
  prompt(site: string): string
  check(seen: Seen): Verdict | Promise<Verdict>
  apps?: string[]
  prepare?(): Promise<() => Promise<void>>
}

export interface LocalTask extends Task {
  place: 'local'
  page(path: string, query: URLSearchParams): string | undefined
}

const plain = (text: string) => text.toLowerCase().replace(/[\s,]/g, '')

export const all = (...verdicts: Verdict[]): Verdict => {
  const failed = verdicts.filter(verdict => !verdict.pass)
  return { pass: !failed.length, why: (failed.length ? failed : verdicts).map(verdict => verdict.why).join('; ') }
}

export const tabAt = ({ tabs }: Seen, pattern: RegExp): Verdict => {
  const tab = tabs.find(tab => pattern.test(tab.url))
  return tab ? { pass: true, why: `open at ${tab.url}` } : { pass: false, why: `no tab at ${pattern.source}; open: ${tabs.map(tab => tab.url).join(', ') || 'none'}` }
}

export const noTabAt = ({ tabs }: Seen, pattern: RegExp, what: string): Verdict => {
  const tab = tabs.find(tab => pattern.test(tab.url))
  return tab ? { pass: false, why: `${what}: ${tab.url}` } : { pass: true, why: `not ${what}` }
}

export const answered = ({ answer }: Seen, ...accepted: string[]): Verdict =>
  accepted.some(value => plain(answer).includes(plain(value)))
    ? { pass: true, why: `answered ${accepted[0]}` }
    : { pass: false, why: `answer lacks ${accepted.join(' or ')}: "${answer.slice(0, 120)}"` }

export const onScreen = ({ elements }: Seen, ...accepted: string[]): Verdict =>
  elements.some(element => accepted.some(value => plain(element.name).includes(plain(value))))
    ? { pass: true, why: `screen shows ${accepted[0]}` }
    : { pass: false, why: `screen lacks ${accepted.join(' or ')}` }
