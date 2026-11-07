import type { LLM, Usage } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { computers, type Computer } from '@sand/computers/contract'
import { startLiveSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { costOf, emptyUsage, sumUsage } from '@sand/usage/contract'
import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { closeOtherTabs, readTabs } from './browser'
import { judge } from './judge'
import { computerOf, promptOf, type Place, type Seen, type Task, type TaskSet } from './tasks'

export interface Model {
  label: string
  id: string
}

export interface Outcome {
  model: string
  task: string
  place: Place
  pass: boolean
  why: string
  ms: number
  steps: number
  inputTokens: number
  outputTokens: number
  costUsd?: number
  judgeUsd: number
  answer: string
  stopReason: string
}

export interface LabOptions {
  set: TaskSet
  judge: string
  headless: boolean
  profile?: string
  limitMs: number
}

export interface Lab {
  sand: Sand
  model: Model
  computer: Computer
  profile: string
  options: LabOptions
}

const plugins: Record<TaskSet, string[]> = {
  browser: ['computer/computers', 'computer/tools', 'computer/browser'],
  desktop: ['computer/computers', 'computer/tools', 'computer/desktop'],
}

const judgeFit = { width: 1568, height: 1568 }

const priced = (llm: LLM, model: string, usage: Usage) => {
  const price = llm.price?.(model)
  return price && costOf(usage, price)
}

const stepsOf = (chat: Session) =>
  chat
    .messages()
    .flatMap(message => message.content)
    .filter(block => block.type === 'tool_call').length

export const openLab = async (model: Model, options: LabOptions): Promise<Lab> => {
  const sand = await startLiveSand([model.id, options.judge], { plugins: plugins[options.set], sections: { browser: { headless: options.headless } } })
  const profile = join(sand.home, 'computers', 'browser', 'profile')
  if (options.profile) cpSync(options.profile, profile, { recursive: true })
  await sand.app.get(tools)?.choose('computer', 'always')
  const computer = sand.app.get(computers)?.get(computerOf[options.set])
  if (!computer) {
    await sand.stop()
    throw new Error(`sand has no ${computerOf[options.set]} computer on this machine`)
  }
  return { sand, model, computer, profile, options }
}

const fresh = async ({ computer, profile }: Lab, task: Task) => {
  if (task.set !== 'browser') return
  await computer.act({ type: 'open', url: 'about:blank' })
  await closeOtherTabs(profile)
}

export const runTask = async (lab: Lab, task: Task, site: string): Promise<Outcome> => {
  const { sand, model, computer, profile, options } = lab
  await fresh(lab, task)
  const chat = sand.chat(model.id)
  const started = performance.now()
  const result = await sand.turns.run(chat, promptOf(task, site), { signal: AbortSignal.timeout(options.limitMs) })
  const ms = performance.now() - started
  let judged = emptyUsage()
  const seen: Seen = {
    answer: result.text,
    tabs: task.set === 'browser' ? await readTabs(profile) : [],
    elements: await computer.elements(),
    async judge(goal) {
      const verdict = await judge(sand.llm, sand.media, options.judge, await computer.screenshot(judgeFit), goal)
      judged = sumUsage(judged, verdict.usage)
      return verdict
    },
  }
  const verdict = await task.check(seen)
  return {
    model: model.label,
    task: task.id,
    place: task.place,
    pass: verdict.pass,
    why: result.error ? `${verdict.why}; ${result.error}` : verdict.why,
    ms,
    steps: stepsOf(chat),
    inputTokens: result.usage.input + result.usage.cacheRead + result.usage.cacheWrite,
    outputTokens: result.usage.output,
    costUsd: priced(sand.llm, model.id, result.usage),
    judgeUsd: priced(sand.llm, options.judge, judged) ?? 0,
    answer: result.text,
    stopReason: result.stopReason,
  }
}
