import type { Outcome } from '@sand/computers/contract'
import { evaluate } from './evaluate'
import { capture } from './screen'
import type { Call } from './tabs'

interface Before {
  url: string
  screen: Uint8Array
}

interface After {
  url: string
  changes?: number
}

const watch = `(() => {
  globalThis.sandWatch?.disconnect()
  globalThis.sandChanges = 0
  globalThis.sandWatch = new MutationObserver(records => (globalThis.sandChanges += records.length))
  globalThis.sandWatch.observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
  return location.href
})()`

const look = '({ url: location.href, changes: globalThis.sandChanges })'

const watchPage = async (call: Call): Promise<Before> => {
  const [{ result }, screen] = await Promise.all([evaluate<string>(call, { expression: watch }), capture(call, undefined)])
  return { url: result.value, screen }
}

const outcomeOf = async (before: Before, call: Call): Promise<Outcome> => {
  const { result } = await evaluate<After>(call, { expression: look })
  const { url, changes } = result.value
  if (url !== before.url) return { type: 'navigated', from: before.url, to: url }
  if (changes !== 0) return { type: 'changed' }
  const same = Buffer.compare(before.screen, await capture(call, undefined)) === 0
  return { type: same ? 'unchanged' : 'changed' }
}

export { outcomeOf, watchPage }
