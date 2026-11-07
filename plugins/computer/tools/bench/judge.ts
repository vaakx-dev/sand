import type { LLM, Usage } from '@sand/accounts/contract'
import type { ModelContent } from '@sand/chats/contract'
import type { Screenshot } from '@sand/computers/contract'
import type { Media } from '@sand/media/contract'
import type { Verdict } from './tasks'

const judgeSystem =
  'You check whether a task on a computer was done, from a screenshot taken when the agent stopped. Judge only what the screenshot shows. Reply with PASS or FAIL on the first line, then one short sentence on what you see.'

export const causes = {
  misclick: 'Misclicks',
  'not-found': 'Did not find the target',
  'lost-goal': 'Lost track of the goal',
  'gave-up': 'Gave up',
  'wrong-answer': 'Wrong final answer',
  timeout: 'Ran out of time',
  error: 'Tool or model error',
} as const

export type Cause = keyof typeof causes

const diagnoseSystem = `You read the log of an AI agent that used a computer (screenshots, UI element lists, clicks, typing) and failed a task. Name the main reason it failed, as one of:
${Object.entries(causes)
  .map(([cause, label]) => `- ${cause}: ${label}`)
  .join('\n')}

misclick: it aimed at the right control but hit something else, or a drag or scroll landed wrong. not-found: it never located the control or the information it needed. lost-goal: it did something other than asked, skipped part of the task, or changed what it shouldn't. gave-up: it stopped and said it could not finish. wrong-answer: it finished and replied, but the reply or the end state is wrong. timeout: it was still working when time ran out. error: a tool or the model itself failed.
Reply with the reason on the first line, then one short sentence of evidence from the log.`

export interface Judged extends Verdict {
  usage: Usage
}

const ask = async (llm: LLM, model: string, system: string, content: ModelContent[]) => {
  const request = { system, model, tools: [], messages: [{ role: 'user' as const, content }] }
  for await (const event of llm.stream(request)) {
    if (event.type !== 'done') continue
    return { text: event.message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('').trim(), usage: event.usage }
  }
  throw new Error(`${model} ended without a reply`)
}

export const judge = async (llm: LLM, media: Media, model: string, { png, width, height }: Screenshot, goal: string): Promise<Judged> => {
  const image = { ...media.put(png, 'image/png'), type: 'image' as const, mediaType: 'image/png', width, height }
  const { text, usage } = await ask(llm, model, judgeSystem, [image, { type: 'text', text: `Goal: ${goal}` }])
  return { pass: /^PASS/i.test(text), why: `judge: ${text.replace(/^(PASS|FAIL)\W*/i, '')}`, usage }
}

export interface Diagnosis {
  cause: Cause
  evidence: string
  usage: Usage
}

const isCause = (word: string): word is Cause => Object.hasOwn(causes, word)

export const diagnose = async (llm: LLM, model: string, report: string): Promise<Diagnosis> => {
  const { text, usage } = await ask(llm, model, diagnoseSystem, [{ type: 'text', text: report }])
  const [, word = '', evidence = ''] = text.match(/^\W*([a-z-]+)\W*([\s\S]*)$/i) ?? []
  const cause = word.toLowerCase()
  if (!isCause(cause)) throw new Error(`${model} named no failure reason: "${text.slice(0, 80)}"`)
  return { cause, evidence: evidence.replace(/\s+/g, ' ').trim(), usage }
}
