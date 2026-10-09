import { errorMessage } from '@sand/kit'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const macApp = '/Applications/Tailscale.app/Contents/MacOS/Tailscale'

export interface CommandResult {
  code: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

export const findTailscale = () => {
  const found = Bun.which('tailscale')
  if (found) return found
  if (process.platform === 'darwin' && existsSync(macApp)) return macApp
  if (process.platform === 'win32') {
    const windows = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Tailscale', 'tailscale.exe')
    if (existsSync(windows)) return windows
  }
  return undefined
}

const collect = (stream: ReadableStream<Uint8Array>) => {
  const chunks: string[] = []
  const decoder = new TextDecoder()
  const done = (async () => {
    for await (const chunk of stream) chunks.push(decoder.decode(chunk, { stream: true }))
  })().catch(() => {})
  return { done, text: () => chunks.join('') }
}

export const runTailscale = async (binary: string, args: string[], timeout: number): Promise<CommandResult> => {
  try {
    const child = Bun.spawn([binary, ...args], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true })
    const stdout = collect(child.stdout)
    const stderr = collect(child.stderr)
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeout)
    const code = await child.exited
    clearTimeout(timer)
    await Promise.race([Promise.all([stdout.done, stderr.done]), Bun.sleep(500)])
    return { code: timedOut ? null : code, stdout: stdout.text(), stderr: stderr.text(), timedOut }
  } catch (error) {
    return { code: null, stdout: '', stderr: errorMessage(error), timedOut: false }
  }
}
