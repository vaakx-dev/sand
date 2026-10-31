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

  const cascaded = () => new Map(switches.off().flatMap(({ dir, needs }) => (needs.length ? [[dir, needs] as const] : [])))

  const state = ({ id, dir, label, summary, builtin }: Extension, off: ReadonlyMap<string, string[]>): WebExtensionState => {
    const built = site.current()
    const browser = reported.get(id)
    const needs = off.get(dir) ?? needsOf(browser)
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

  const list = () => {
    const off = cascaded()
    return site.list().map(extension => state(extension, off))
  }

  const webOff = (): PluginOff[] =>
    site.list().flatMap(({ id, dir }) => {
      const needs = needsOf(reported.get(id))
      return needs ? [{ id, dir, needs }] : []
    })

  const unmounted = () => {
    const off = cascaded()
    return site.list().flatMap(({ id, dir }) => (off.has(dir) ? [id] : []))
  }

  return {
    list,
    unmounted,
    off: () => [...switches.off(), ...webOff()],
    report(states: BrowserState[]) {
      reported = new Map(states.map(browser => [browser.id, browser]))
      at = Date.now()
    },
  }
}
