import type { Bundle } from '../bundle/build'
import type { BrowserState, WebExtensionState } from '../contract'
import type { Extension } from './discover'

export interface StateSource {
  list(): Extension[]
  current(): Bundle
}

export const createStates = (site: StateSource) => {
  let reported = new Map<string, BrowserState>()
  let at = 0

  const state = ({ id, dir, label, summary, builtin, enabled, provides }: Extension): WebExtensionState => {
    const built = site.current()
    const browser = reported.get(id)
    return {
      id,
      dir,
      label,
      summary,
      builtin,
      enabled,
      provides,
      bundled: built.bundled.includes(id),
      problem: built.failed[id],
      browser: browser && { ...browser, at },
    }
  }

  return {
    list: () => site.list().map(state),
    report(states: BrowserState[]) {
      reported = new Map(states.map(browser => [browser.id, browser]))
      at = Date.now()
    },
  }
}
