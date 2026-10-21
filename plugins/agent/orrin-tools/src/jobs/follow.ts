import type { LogLine, Orrin } from '@sand/orrin/contract'

interface Following {
  signal: AbortSignal
  timeoutMs: number
  progress(text: string): void
}

const page = 500
const waitMs = 2_000

export const followLogs = async (orrin: Orrin, job: string, { signal, timeoutMs, progress }: Following) => {
  const lines: LogLine[] = []
  const deadline = Date.now() + timeoutMs
  let after: number | undefined
  while (true) {
    const logs = await orrin.call('job.logs', { job, limit: page, wait_ms: waitMs, ...(after === undefined ? {} : { after }) }, signal)
    for (const line of logs.lines) {
      lines.push(line)
      progress(line.text)
      after = line.n
    }
    if (logs.done && logs.lines.length < page) return { lines, timedOut: false }
    if (Date.now() > deadline) return { lines, timedOut: true }
  }
}
