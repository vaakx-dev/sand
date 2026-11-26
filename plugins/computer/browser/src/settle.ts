import { evaluate } from './evaluate'
import type { Call } from './tabs'

const quiet = 300
const longest = 3_000
const retry = 100

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

export const settle = async (call: Call) => {
  await Bun.sleep(quiet)
  const deadline = Date.now() + longest
  while (Date.now() < deadline && !(await paintedBefore(call, deadline))) await Bun.sleep(retry)
}
