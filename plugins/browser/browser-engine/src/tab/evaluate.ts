import type { Cdp } from '../chrome'

interface Evaluated {
  result: { type: string; value?: unknown; description?: string }
  exceptionDetails?: { text: string; exception?: { description?: string } }
}

const maxResult = 10_000
const paintTimeoutMs = 1000

const nextFrames = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'

export const evaluate = async (cdp: Cdp, expression: string) => {
  const { result, exceptionDetails } = await cdp.send<Evaluated>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
  return result.value
}

export const evaluateScript = async (cdp: Cdp, script: string) => {
  const value = await evaluate(cdp, `(async () => {\n${script}\n})()`)
  const shown = value === undefined ? 'undefined' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return shown.length > maxResult ? `${shown.slice(0, maxResult)}\n… cut at ${maxResult} of ${shown.length} characters` : shown
}

export const painted = (cdp: Cdp) => Promise.race([evaluate(cdp, nextFrames).catch(() => undefined), Bun.sleep(paintTimeoutMs)])
