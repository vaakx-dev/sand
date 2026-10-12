import type { Run } from './runs'

export interface Repeated {
  run: Run
  count: number
}

export const runningCounts = (runs: Run[]) => {
  const counts = { agent: 0, shell: 0 }
  for (const run of runs) {
    if (run.status !== 'running') continue
    if (run.kind === 'shell') counts.shell++
    else counts.agent += Math.max(1, run.members.filter(member => member.running).length)
  }
  return counts
}

export const collapseRepeats = (runs: Run[]): Repeated[] => {
  const groups = new Map<string, Repeated>()
  for (const run of runs) {
    const key = `${run.name}\n${run.title}`
    const seen = groups.get(key)
    if (seen) seen.count++
    else groups.set(key, { run, count: 1 })
  }
  return [...groups.values()]
}
