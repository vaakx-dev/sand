import { evaluate } from './evaluate'
import type { Call, Tabs } from './tabs'

const QUIET_MS = 300
const PAINT_MS = 3_000
const LOAD_MS = 15_000
const RETRY_MS = 100

const painted = `new Promise(done => {
  if (document.readyState !== 'complete') return done(false)
  setTimeout(() => done(true), 500)
  requestAnimationFrame(() => requestAnimationFrame(() => done(true)))
})`

const isPainted = (call: Call) =>
  evaluate<unknown>(call, { expression: painted, awaitPromise: true }).then(
    ({ result }) => result.value === true,
    () => false,
  )

const paintedBefore = (call: Call, deadline: number) => Promise.race([isPainted(call), Bun.sleep(deadline - Date.now()).then(() => false)])

type Loading = Pick<Tabs, 'current' | 'loaded'>

const loadedWithin = async (tabs: Loading, ms: number) => {
  let timer: Timer | undefined
  const timeout = new Promise<void>(done => (timer = setTimeout(done, ms)))
  await Promise.race([tabs.loaded(), timeout])
  clearTimeout(timer)
}

const settle = async (tabs: Loading) => {
  await Bun.sleep(QUIET_MS)
  await loadedWithin(tabs, LOAD_MS)
  const call = await tabs.current()
  const deadline = Date.now() + PAINT_MS
  while (Date.now() < deadline && !(await paintedBefore(call, deadline))) await Bun.sleep(RETRY_MS)
}

export { settle }
