import type { ScriptCall, ScriptHead, ScriptRun, ScriptStatus, ScriptUpdate } from './contract'

type Started = Pick<ScriptHead, 'id' | 'thread' | 'title' | 'code'>

interface Kept {
  run: ScriptRun
  stop: AbortController
}

const FINISHED_KEPT = 3

const headOf = ({ calls: _, ...head }: ScriptRun): ScriptHead => head

const createRuns = (updated: (update: ScriptUpdate) => void) => {
  const kept = new Map<string, Kept>()

  const finishedIn = (thread: string) => [...kept.values()].filter(({ run }) => run.thread === thread && run.status !== 'running')

  const prune = (thread: string) => finishedIn(thread).slice(0, -FINISHED_KEPT).forEach(({ run }) => kept.delete(run.id))

  const start = (started: Started) => {
    const run: ScriptRun = { ...started, status: 'running', started: Date.now(), calls: [] }
    const stop = new AbortController()
    kept.set(run.id, { run, stop })
    updated({ head: headOf(run) })

    const record = (call: ScriptCall) => {
      const index = run.calls.findIndex(known => known.call.id === call.call.id)
      run.calls = index < 0 ? [...run.calls, call] : run.calls.with(index, call)
      updated({ head: headOf(run), call })
    }

    const end = (status: ScriptStatus) => {
      Object.assign(run, { status, ended: Date.now() })
      updated({ head: headOf(run) })
      prune(run.thread)
      return run
    }

    return { signal: stop.signal, record, end }
  }

  const stop = (id: string) => {
    const found = kept.get(id)
    if (found?.run.status !== 'running') return false
    found.stop.abort()
    return true
  }

  return { start, stop, list: () => [...kept.values()].map(({ run }) => run) }
}

type Runs = ReturnType<typeof createRuns>

export { createRuns, type Runs }
