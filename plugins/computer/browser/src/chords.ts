import { parseKeys, type Key } from '@sand/computers/contract'
import type { Tab, Tabs } from './tabs'

type Command = (tabs: Tabs) => unknown

const nameOf = (keys: Key[]) =>
  keys
    .map(key => (key.name === 'meta' ? 'ctrl' : key.name))
    .sort()
    .join('+')

const digits = Array.from({ length: 8 }, (_, index): [string, Command] => [`ctrl+${index + 1}`, tabs => tabs.select(index)])

const commands = new Map(
  (
    [
      ['ctrl+tab', tabs => tabs.step(1)],
      ['ctrl+pagedown', tabs => tabs.step(1)],
      ['ctrl+shift+tab', tabs => tabs.step(-1)],
      ['ctrl+pageup', tabs => tabs.step(-1)],
      ...digits,
      ['ctrl+9', tabs => tabs.select(-1)],
      ['ctrl+w', tabs => tabs.closeCurrent()],
      ['ctrl+t', tabs => tabs.create()],
    ] satisfies [string, Command][]
  ).map(([combo, command]) => [nameOf(parseKeys(combo)), command]),
)

export const tabCommand = (keys: Key[]) => commands.get(nameOf(keys))

export const tabsNote = (tabs: Tab[]) =>
  [
    'Tabs (ctrl+1..9 or ctrl+tab switches, ctrl+w closes, ctrl+t opens):',
    ...tabs.map(({ title, url, active }, index) => `${index + 1}. ${active ? '[active] ' : ''}${title} — ${url}`),
  ].join('\n')
