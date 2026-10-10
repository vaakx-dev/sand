import { gh } from '../gh'
import { byOutcome, checkName, checkUrl } from './checks'
import type { Check, Failure } from './types'

const maxFailures = 3
const tailLines = 30
const jobPattern = /\/actions\/runs\/\d+\/job\/(\d+)/
const ansi = /\x1b\[[0-9;]*m/g
const prefix = /^[^\t]*\t[^\t]*\t(\d{4}-\d\d-\d\dT\S+ ?)?/
const maxLine = 300

const ungroup = (lines: string[]) => {
  let inGroup = false
  return lines.flatMap(line => {
    if (line.startsWith('##[group]')) return (inGroup = true), [`▸ ${line.slice(9)}`]
    if (line.startsWith('##[endgroup]')) return (inGroup = false), []
    return inGroup ? [] : [line]
  })
}

const tail = (log: string) => {
  const lines = ungroup(
    log
      .replace(ansi, '')
      .split(/\r?\n/)
      .map(line => line.replace(prefix, ''))
      .filter(line => line.trim()),
  ).map(line => (line.length > maxLine ? `${line.slice(0, maxLine)}…` : line))
  const error = lines.findLastIndex(line => line.includes('##[error]'))
  const end = error < 0 ? lines.length : error + 1
  const step = lines.slice(0, end).findLastIndex(line => line.startsWith('▸ '))
  return lines
    .slice(Math.max(step, 0), end)
    .slice(-tailLines)
    .join('\n')
}

const jobLog = async (check: Check, repo: string, cwd: string, signal: AbortSignal) => {
  const job = checkUrl(check)?.match(jobPattern)?.[1]
  if (!job) return ''
  try {
    return tail(await gh(['run', 'view', '--repo', repo, '--job', job, '--log-failed'], cwd, signal))
  } catch {
    return ''
  }
}

const distinct = (checks: Check[]) => [...new Map(checks.map(check => [checkName(check), check])).values()]

export const failures = (checks: Check[], repo: string, cwd: string, signal: AbortSignal): Promise<Failure[]> =>
  Promise.all(
    distinct(byOutcome(checks, 'failed'))
      .slice(0, maxFailures)
      .map(async check => ({ name: checkName(check), url: checkUrl(check), log: await jobLog(check, repo, cwd, signal) })),
  )
