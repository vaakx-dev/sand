import { drain, spawn, stream, unixNewlines, type SpawnOptions } from './process'

export type Stop = 'silence' | 'limit'

export interface Timeouts {
  silence: number
  limit: number
}

interface RunOptions extends SpawnOptions, Timeouts {
  signal: AbortSignal
  onText?: (text: string) => void
}

const watchdog = ({ silence, limit }: Timeouts, stop: (reason: Stop) => void) => {
  const started = performance.now()
  let heard = started
  const check = () => {
    const now = performance.now()
    if (now - started >= limit) return stop('limit')
    if (now - heard >= silence) return stop('silence')
    timer = setTimeout(check, Math.min(heard + silence, started + limit) - now)
  }
  let timer = setTimeout(check, Math.min(silence, limit))
  return {
    hear: () => {
      heard = performance.now()
    },
    clear: () => clearTimeout(timer),
  }
}

export const run = async (argv: string[], { signal, silence, limit, onText, ...options }: RunOptions) => {
  const { child, killTree } = spawn(argv, 'ignore', options)
  let stopped: Stop | undefined
  const watch = watchdog({ silence, limit }, reason => {
    stopped = reason
    void killTree()
  })
  const hear = (text: string) => {
    watch.hear()
    onText?.(text)
  }
  let stdout = ''
  let stderr = ''
  const streams = [
    stream(child.stdout, text => {
      stdout += text
      hear(text)
    }),
    stream(child.stderr, text => {
      stderr += text
      hear(text)
    }),
  ]
  const abort = () => void killTree()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()

  const code = await child.exited
  watch.clear()
  signal.removeEventListener('abort', abort)

  await drain(streams)
  return { code, stopped, stdout: unixNewlines(stdout), stderr: unixNewlines(stderr) }
}
