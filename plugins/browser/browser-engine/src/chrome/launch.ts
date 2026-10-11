import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { connect, type Cdp } from './cdp'

export interface PageTarget {
  id: string
  cdp: Cdp
}

export interface Chrome {
  dir: string
  browser: Cdp
  open(context?: string): Promise<PageTarget>
  close(): Promise<void>
}

const listening = /DevTools listening on (ws:\/\/[^\s]+)/

const drain = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  while (!(await reader.read()).done);
}

const devtoolsUrl = async (stderr: ReadableStream<Uint8Array>) => {
  const reader = stderr.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    const found = listening.exec(text)
    if (!found) continue
    void drain(reader)
    return new URL(found[1]!)
  }
  throw new Error(`The browser exited before it was ready:\n${text.trim().slice(-2000)}`)
}

const flags = (dir: string, extra: string[]) => [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${dir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-sync',
  '--mute-audio',
  ...extra,
  'about:blank',
]

const remove = (dir: string) => rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })

const spawn = async (executable: string, dir: string, extra: string[]) => {
  try {
    return Bun.spawn([executable, ...flags(dir, extra)], { stdin: 'ignore', stdout: 'ignore', stderr: 'pipe', windowsHide: true })
  } catch (error) {
    await remove(dir)
    throw error
  }
}

export const launch = async (executable: string, extra: string[] = []): Promise<Chrome> => {
  const dir = await mkdtemp(join(tmpdir(), 'sand-browser-'))
  const child = await spawn(executable, dir, extra)
  const close = async () => {
    child.kill()
    await child.exited
    await remove(dir)
  }
  try {
    const url = await devtoolsUrl(child.stderr)
    const browser = await connect(url.href)
    return {
      dir,
      browser,
      async open(context) {
        const { targetId } = await browser.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank', ...(context && { browserContextId: context }) })
        return { id: targetId, cdp: await connect(`ws://${url.host}/devtools/page/${targetId}`) }
      },
      close,
    }
  } catch (error) {
    await close()
    throw error
  }
}
