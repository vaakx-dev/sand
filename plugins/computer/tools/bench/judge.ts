import type { LLM, Usage } from '@sand/accounts/contract'
import type { Screenshot } from '@sand/computers/contract'
import type { Media } from '@sand/media/contract'
import type { Verdict } from './tasks'

const system =
  'You check whether a task on a computer was done, from a screenshot taken when the agent stopped. Judge only what the screenshot shows. Reply with PASS or FAIL on the first line, then one short sentence on what you see.'

export interface Judged extends Verdict {
  usage: Usage
}

export const judge = async (llm: LLM, media: Media, model: string, { png, width, height }: Screenshot, goal: string): Promise<Judged> => {
  const image = { ...media.put(png, 'image/png'), type: 'image' as const, mediaType: 'image/png', width, height }
  const request = { system, model, tools: [], messages: [{ role: 'user' as const, content: [image, { type: 'text' as const, text: `Goal: ${goal}` }] }] }
  for await (const event of llm.stream(request)) {
    if (event.type !== 'done') continue
    const text = event.message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('').trim()
    return { pass: /^PASS/i.test(text), why: `judge: ${text.replace(/^(PASS|FAIL)\W*/i, '')}`, usage: event.usage }
  }
  throw new Error(`${model} ended without a verdict`)
}
