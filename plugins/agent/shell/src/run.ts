import { drain, spawn, type SpawnOptions, stream, unixNewlines } from '@sand/process-tree'
import { Repeats } from './repeats'

export type Stop = 'silence' | 'repeats' | 'limit'

export interface Timeouts {
  silence: number
  limit: number
}

interface RunOptions extends SpawnOptions, Timeouts {
  signal: AbortSignal
  onText?: (text: string) => void
}

const watchdog = ({ silence, limit }: Timeouts, stop: (reason: Exclude<Stop, 'repeats'>) => void) => {
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
  let repeating: string | undefined
  let repeated: string | undefined
  const watch = watchdog({ silence, limit }, reason => {
    repeated = reason === 'silence' ? repeating : undefined
    stopped = repeated ? 'repeats' : reason
    void killTree()
  })
  const listen = (keep: (text: string) => void) => {
    const repeats = new Repeats()
    return (text: string) => {
      keep(text)
      onText?.(text)
      if (repeats.hear(text) === 'repeat') {
        repeating = repeats.sample ?? repeating
        return
      }
      repeating = undefined
      watch.hear()
    }
  }
  let stdout = ''
  let stderr = ''
  const streams = [
    stream(
      child.stdout,
      listen(text => {
        stdout += text
      }),
    ),
    stream(
      child.stderr,
      listen(text => {
        stderr += text
      }),
    ),
  ]
  const abort = () => void killTree()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()

  const code = await child.exited
  watch.clear()
  signal.removeEventListener('abort', abort)

  await drain(streams)
  return { code, stopped, repeated, stdout: unixNewlines(stdout), stderr: unixNewlines(stderr) }
}
