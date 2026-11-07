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
  call<{ result: { value?: unknown } }>('Runtime.evaluate', { expression: painted, awaitPromise: true, returnByValue: true }).then(
    ({ result }) => result.value === true,
    () => false,
  )

export const settle = async (call: Call) => {
  await Bun.sleep(quiet)
  const deadline = Date.now() + longest
  while (Date.now() < deadline && !(await isPainted(call))) await Bun.sleep(retry)
}
