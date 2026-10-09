import type { Hello, RuntimeView } from '@sand/protocol'

export const mergeHello = (hello: Hello, others: RuntimeView[]): Hello => {
  const active = new Set(hello.active)
  const jobs = [...hello.jobs]
  const known = new Set(jobs.map(job => job.id))
  for (const runtime of others) {
    if (runtime.state !== 'draining') continue
    for (const session of runtime.activity.sessions) active.add(session)
    for (const job of runtime.activity.jobs) {
      if (known.has(job.id)) continue
      known.add(job.id)
      jobs.push(job)
    }
  }
  return { ...hello, active: [...active], jobs }
}
