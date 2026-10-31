import type { PluginOff, PluginSwitches } from '@sand/config/contract'
import type { Bundle } from '../bundle/build'
import type { BrowserState, WebExtensionState } from '../contract'
import type { Extension } from './discover'

export interface StateSource {
  list(): Extension[]
  current(): Bundle
}

export const createStates = (site: StateSource, switches: PluginSwitches) => {
  let reported = new Map<string, BrowserState>()
  let at = 0

  const needsOf = (browser: BrowserState | undefined) =>
    browser?.status === 'pending' && browser.missing ? switches.needs(browser.missing) : undefined

  const state = ({ id, dir, label, summary, builtin }: Extension): WebExtensionState => {
    const built = site.current()
    const browser = reported.get(id)
    const needs = needsOf(browser)
    return {
      id,
      dir,
      label,
      summary,
      builtin,
      bundled: built.bundled.includes(id),
      problem: built.failed[id],
      browser: browser && { ...browser, at },
      ...(needs && { needs }),
    }
  }

  const list = () => site.list().map(state)

  const webOff = (): PluginOff[] => list().flatMap(({ id, dir, needs }) => (needs ? [{ id, dir, needs }] : []))

  return {
    list,
    off: () => [...switches.off(), ...webOff()],
    report(states: BrowserState[]) {
      reported = new Map(states.map(browser => [browser.id, browser]))
      at = Date.now()
    },
  }
}
