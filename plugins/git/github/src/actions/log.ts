import type { Client } from '../api/client'

const tailLimit = 4000

const stamp = /^\d{4}-\d\d-\d\dT[\d:.]+Z ?/

const ansi = /\x1b\[[\d;]*m/g

const failedTail = (log: string) => {
  const lines = log.split(/\r?\n/).map(line => line.replace(stamp, '').replace(ansi, ''))
  const failed = lines.findLastIndex(line => line.startsWith('##[error]'))
  const end = failed < 0 ? lines.length : failed + 1
  const step = lines.slice(0, end).findLastIndex(line => line.startsWith('##[group]Run '))
  const text = lines.slice(Math.max(step, 0), end).join('\n').trimEnd()
  return text.length > tailLimit ? `…${text.slice(-tailLimit)}` : text
}

export const jobLog = async (client: Client, repo: string, job: number) => failedTail(await client.text(`/repos/${repo}/actions/jobs/${job}/logs`))
