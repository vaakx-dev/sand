import { runTailscale } from './binary'
import { explainServe } from './errors'

const serveTimeout = 20_000

export const sandTarget = (port: number) => `http://127.0.0.1:${port}`

const serve = async (binary: string, args: string[], on: boolean) => {
  const result = await runTailscale(binary, ['serve', ...args], serveTimeout)
  return result.code === 0 && !result.timedOut ? undefined : explainServe(result, on, serveTimeout)
}

export const serveOn = (binary: string, port: number) => serve(binary, ['--bg', '--https=443', sandTarget(port)], true)

export const serveOff = (binary: string) => serve(binary, ['--https=443', 'off'], false)
