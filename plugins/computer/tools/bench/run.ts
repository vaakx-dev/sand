import type { LLM, Usage } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { computers, type Computer } from '@sand/computers/contract'
import { startLiveSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { costOf, emptyUsage, sumUsage } from '@sand/usage/contract'
import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { closeOtherTabs, readTabs } from './browser'
import { diagnose, judge, type Cause } from './judge'
import { computerOf, promptOf, type Kind, type Place, type Seen, type Task, type TaskSet, type Verdict } from './tasks'
import { transcriptOf } from './transcript'
import { restore, snapshot } from './windows'

export interface Model {
  label: string
  id: string
}

export interface Outcome {
  model: string
  task: string
  place: Place
  kind: Kind
  pass: boolean
  why: string
  cause?: Cause
  evidence?: string
  ms: number
  steps: number
  inputTokens: number
  outputTokens: number
  costUsd?: number
  judgeUsd: number
  answer: string
  stopReason: string
  transcript: string[]
  left: string[]
}

export interface LabOptions {
  set: TaskSet
  judge: string
  headless: boolean
  profile?: string
  limitMs: number
  prices: Record<string, unknown>
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

const maxLogLines = 160

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
  const sand = await startLiveSand([model.id, options.judge], { plugins: plugins[options.set], sections: { browser: { headless: options.headless }, accounts: { prices: options.prices } } })
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

const diagnosisOf = (prompt: string, verdict: Verdict, stopped: string, transcript: string[]) =>
  [`Task: ${prompt}`, `Check failed: ${verdict.why}`, `Stopped: ${stopped}`, 'Log:', ...transcript.slice(-maxLogLines)].join('\n')

const attempt = async (lab: Lab, task: Task, site: string): Promise<Outcome> => {
  const { sand, model, computer, profile, options } = lab
  await fresh(lab, task)
  const chat = sand.chat(model.id)
  const prompt = promptOf(task, site)
  const started = performance.now()
  const result = await sand.turns.run(chat, prompt, { signal: AbortSignal.timeout(options.limitMs) })
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
  const transcript = transcriptOf(chat.messages())
  const stopped = result.error ? `${result.stopReason}: ${result.error}` : result.stopReason
  const diagnosis = verdict.pass
    ? undefined
    : await diagnose(sand.llm, options.judge, diagnosisOf(prompt, verdict, stopped, transcript)).catch((error: unknown) => {
        console.log(`  no diagnosis for ${model.label} ${task.id}: ${error}`)
      })
  if (diagnosis) judged = sumUsage(judged, diagnosis.usage)
  return {
    model: model.label,
    task: task.id,
    place: task.place,
    kind: task.kind,
    pass: verdict.pass,
    why: result.error ? `${verdict.why}; ${result.error}` : verdict.why,
    cause: diagnosis?.cause,
    evidence: diagnosis?.evidence,
    ms,
    steps: stepsOf(chat),
    inputTokens: result.usage.input + result.usage.cacheRead + result.usage.cacheWrite,
    outputTokens: result.usage.output,
    costUsd: priced(sand.llm, model.id, result.usage),
    judgeUsd: priced(sand.llm, options.judge, judged) ?? 0,
    answer: result.text,
    stopReason: result.stopReason,
    transcript,
    left: [],
  }
}

export const runTask = async (lab: Lab, task: Task, site: string): Promise<Outcome> => {
  const undo = await task.prepare?.()
  const before = task.set === 'desktop' ? await snapshot() : undefined
  const tidy = async () => (before ? (await restore(before, task.apps ?? [])).map(window => `${window.title} (${window.process})`) : [])
  try {
    const outcome = await attempt(lab, task, site)
    return { ...outcome, left: await tidy() }
  } catch (error) {
    await tidy()
    throw error
  } finally {
    await undo?.()
  }
}
