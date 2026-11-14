import type { TailscaleShare } from '@sand/devices-contract'
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

const SHARE_READY_MS = 20_000

const announced = async (output: ReadableStream<Uint8Array>, url: string) => {
  const decoder = new TextDecoder()
  let seen = ''
  for await (const chunk of output) {
    seen += decoder.decode(chunk, { stream: true })
    if (seen.includes(url)) return url
  }
  return undefined
}

export const shareOn = async (binary: string, name: string, port: number): Promise<TailscaleShare | undefined> => {
  const shared = `https://${name}:${port}`
  const child = Bun.spawn([binary, 'serve', `--https=${port}`, sandTarget(port)], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const stop = () => child.kill()
  const url = await Promise.race([announced(child.stdout, shared), announced(child.stderr, shared), child.exited.then(() => undefined), Bun.sleep(SHARE_READY_MS).then(() => undefined)])
  if (!url) stop()
  return url ? { url, stop } : undefined
}
