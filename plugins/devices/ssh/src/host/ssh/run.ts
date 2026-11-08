import { join } from 'node:path'
import type { Answers } from '../askpass/answers'
import type { Bridge } from '../askpass/bridge'
import { stripAnsi } from './text'

export interface SshCall {
  destination: string[]
  command?: string
  stdin?: string
  forwards?: string[]
  answers?: Answers
  signal?: AbortSignal
  line?: (text: string) => void
}

export interface SshResult {
  code: number
  stdout: string
  stderr: string
}

export interface SshProcess {
  exited: Promise<SshResult>
  kill(): void
}

export type Ssh = (call: SshCall) => SshProcess

const always = ['-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3', '-o', 'ConnectTimeout=15']
const forwarding = ['-o', 'ExitOnForwardFailure=yes', '-o', 'ControlMaster=no', '-o', 'ControlPath=none']

const windowsOpenSsh = () => Bun.which('ssh', { PATH: join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'OpenSSH') })

const sshBinary = () => (process.platform === 'win32' && windowsOpenSsh()) || Bun.which('ssh')

const sshArgs = ({ destination, command, forwards }: Pick<SshCall, 'destination' | 'command' | 'forwards'>) => [
  ...always,
  ...(forwards ? [...forwarding, ...(command ? [] : ['-N', '-T']), ...forwards] : []),
  ...destination,
  ...(command ? [command] : []),
]

const collect = async (stream: ReadableStream<Uint8Array>, line?: (text: string) => void) => {
  const decoder = new TextDecoder()
  let text = ''
  let partial = ''
  const emit = (part: string) => {
    const clean = stripAnsi(part).trim()
    if (clean) line?.(clean)
  }
  for await (const chunk of stream) {
    const piece = decoder.decode(chunk, { stream: true })
    text += piece
    if (!line) continue
    const parts = (partial + piece).split(/\r\n|\r|\n/)
    partial = parts.pop() ?? ''
    parts.forEach(emit)
  }
  emit(partial)
  return text + decoder.decode()
}

export const createSsh =
  (bridge: Bridge): Ssh =>
  call => {
    const binary = sshBinary()
    if (!binary) return { exited: Promise.reject(new Error('This PC has no ssh command; install OpenSSH and try again')), kill: () => {} }
    const prompts = call.answers && bridge.register(call.answers.process())
    const child = Bun.spawn([binary, ...sshArgs(call)], {
      stdin: call.stdin === undefined ? 'ignore' : new Blob([call.stdin]),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...prompts?.env },
      windowsHide: true,
    })
    const kill = () => child.kill()
    call.signal?.addEventListener('abort', kill, { once: true })
    if (call.signal?.aborted) kill()
    const exited = Promise.all([collect(child.stdout, call.line), collect(child.stderr, call.line), child.exited])
      .then(([stdout, stderr, code]) => ({ code, stdout, stderr }))
      .finally(() => {
        prompts?.dispose()
        call.signal?.removeEventListener('abort', kill)
      })
    return { exited, kill }
  }
