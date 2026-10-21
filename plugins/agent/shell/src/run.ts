import { drain, spawn, stream, unixNewlines, type SpawnOptions } from './process'

interface RunOptions extends SpawnOptions {
  signal: AbortSignal
  timeout: number
}

export const run = async (argv: string[], { signal, timeout, ...options }: RunOptions) => {
  const { child, killTree } = spawn(argv, 'ignore', options)
  let stdout = ''
  let stderr = ''
  const streams = [stream(child.stdout, text => (stdout += text)), stream(child.stderr, text => (stderr += text))]
  let timedOut = false
  const abort = () => void killTree()
  const timer = setTimeout(() => {
    timedOut = true
    abort()
  }, timeout)
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()

  const code = await child.exited
  clearTimeout(timer)
  signal.removeEventListener('abort', abort)

  await drain(streams)
  return { code, timedOut, stdout: unixNewlines(stdout), stderr: unixNewlines(stderr) }
}
