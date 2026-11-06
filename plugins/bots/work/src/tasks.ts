import type { PullLink } from '@sand/pull-links/contract'
import type { Thread } from '@sand/web-client/contract'

export type Stage = 'need' | 'run' | 'done'

export interface Task {
  thread: Thread
  stage: Stage
  pulls: PullLink[]
  failure?: string
}

export interface TaskSources {
  pullsOf(thread: string): PullLink[]
  earlierFailure(thread: string): string | undefined
}

export interface Tally {
  need: number
  run: number
  pulls: number
}

type Wait = NonNullable<Thread['waiting']>

const stageOrder: Record<Stage, number> = { need: 0, run: 1, done: 2 }

const asks: Record<Wait['kind'], string> = { question: 'Asks', approval: 'Wants approval', secret: 'Needs a secret' }

const startOfToday = () => new Date().setHours(0, 0, 0, 0)

const failureOf = ({ ended, running, id }: Thread, earlierFailure: TaskSources['earlierFailure']) => {
  if (ended) return ended.stopReason === 'error' ? (ended.error ?? 'Failed') : undefined
  return running ? undefined : earlierFailure(id)
}

const stageOf = ({ waiting, running, info }: Thread, failure: string | undefined, today: number): Stage | undefined => {
  if (waiting || failure) return 'need'
  if (running) return 'run'
  return Math.max(info.settled ?? 0, info.updated) >= today ? 'done' : undefined
}

export const tasksOf = (threads: Thread[], { pullsOf, earlierFailure }: TaskSources): Task[] => {
  const today = startOfToday()
  return threads
    .flatMap(thread => {
      const failure = failureOf(thread, earlierFailure)
      const stage = stageOf(thread, failure, today)
      return stage ? [{ thread, stage, pulls: pullsOf(thread.id), ...(failure && { failure }) }] : []
    })
    .sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage] || b.thread.info.updated - a.thread.info.updated)
}

export const tally = (tasks: Task[]): Tally => ({
  need: tasks.filter(task => task.stage === 'need').length,
  run: tasks.filter(task => task.stage === 'run').length,
  pulls: new Set(tasks.flatMap(task => task.pulls.map(pull => `${pull.repo}#${pull.number}`))).size,
})

const needText = ({ thread: { waiting }, failure }: Task) => (waiting ? `${asks[waiting.kind]}: ${waiting.title}` : (failure ?? 'Failed'))

const runText = ({ step, live }: Thread) => {
  const block = live.at(-1)
  const tool = step?.name ?? (block?.type === 'tool' ? block.name : undefined)
  return tool ? `Using ${tool}` : 'Thinking'
}

const pullText = ({ number, summary }: PullLink) => (summary ? `#${number} ${summary.state}` : `#${number}`)

const statusText: Record<Stage, (task: Task) => string> = {
  need: needText,
  run: task => runText(task.thread),
  done: task => (task.thread.ended?.stopReason === 'interrupted' ? 'Stopped' : task.pulls.map(pullText).join(', ') || 'Done'),
}

export const statusOf = (task: Task) => statusText[task.stage](task)

export const titleOf = (thread: Thread) => thread.info.title || 'Untitled thread'
