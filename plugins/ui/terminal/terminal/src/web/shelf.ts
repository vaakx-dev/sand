import { isPcUnavailable, type Wire } from '@sand/devices-contract'
import { type TerminalInfo, terminalList } from '@sand/devices-terminal/contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { ITheme } from '@xterm/xterm'
import { createTab, type Place, type Tab } from './tab'

interface Held {
  tab: Tab
  born: number
}

export const createShelf = (place: Place, wire: Wire, colors: () => ITheme) => {
  const held = sig<Held[]>([])
  const selected = sig<Tab | undefined>(undefined)
  const failure = sig('')
  let born = 0
  let loaded = false

  const tabs = () => held.get().map(entry => entry.tab)

  const pick = (tab: Tab | undefined) => selected.set(tab)

  const remove = (tab: Tab) => {
    const index = tabs().indexOf(tab)
    held.set(held.get().filter(entry => entry.tab !== tab))
    tab.dispose()
    if (selected.get() === tab) pick(tabs()[Math.max(0, index - 1)])
  }

  const make = (known?: TerminalInfo) => {
    const tab: Tab = createTab(place, wire, colors(), () => remove(tab), known)
    held.set([...held.get(), { tab, born: ++born }])
    return tab
  }

  const add = () => pick(make())

  const reconcile = (listed: TerminalInfo[], asked: number) => {
    const ids = new Set(listed.map(info => info.id))
    for (const { tab, born: when } of held.get()) {
      const id = tab.id()
      if (id && when <= asked && !ids.has(id)) remove(tab)
    }
    const kept = new Set(tabs().map(tab => tab.id()))
    for (const info of listed) if (!kept.has(info.id)) make(info)
    const current = selected.get()
    if (!current || !tabs().includes(current)) pick(tabs()[0])
    if (!tabs().length) add()
  }

  const load = async () => {
    const asked = born
    try {
      reconcile(await wire.call(terminalList, { session: place.session }, place.device), asked)
      failure.set('')
      loaded = true
    } catch (error) {
      if (!isPcUnavailable(error)) failure.set(errorMessage(error))
    }
  }

  return {
    place,
    tabs,
    selected,
    failure,
    pick,
    add,
    show() {
      if (!loaded) void load()
    },
    refresh() {
      if (loaded) void load()
    },
    dispose() {
      for (const tab of tabs()) tab.dispose()
      held.set([])
    },
  }
}

export type Shelf = ReturnType<typeof createShelf>
