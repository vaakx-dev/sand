import type { Run } from './runs'

export interface Repeated {
  run: Run
  count: number
}

export const runningAgents = (runs: Run[]) =>
  runs.filter(run => run.status === 'running').reduce((sum, run) => sum + Math.max(1, run.members.filter(member => member.running).length), 0)

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
