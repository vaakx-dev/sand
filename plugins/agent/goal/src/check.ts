import type { LLM, LLMRequest, SourceRef } from '@sand/llm-accounts/contract'
import type { Message, Usage } from '@sand/messages'

export interface Verdict {
  met: boolean
  reason: string
  usage?: Usage
  source?: SourceRef
}

const instruction = (objective: string) => `Pause. You are now a reviewer deciding whether this goal is met:

<goal>
${objective}
</goal>

It is met only if its end state holds now. Progress doesn't count, and neither does the agent saying it's done. Look for evidence such as command output, test results or file contents. If it isn't met, say what is missing or unchecked.

Don't call tools. Reply with only JSON: {"met": true or false, "reason": "one or two sentences"}`

const textOf = (message?: Message) => message?.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n') ?? ''

const parse = (text: string) => {
  const json = /\{[\s\S]*\}/.exec(text)?.[0]
  if (!json) return undefined
  try {
    const value = JSON.parse(json) as { met?: unknown; reason?: unknown }
    return typeof value.met === 'boolean' ? { met: value.met, reason: String(value.reason ?? '').trim() } : undefined
  } catch {
    return undefined
  }
}

export const check = async (llm: LLM, request: LLMRequest, objective: string, signal: AbortSignal): Promise<Verdict> => {
  const ask: Message = { role: 'user', content: [{ type: 'text', text: instruction(objective) }] }
  let reply: Message | undefined
  let usage: Usage | undefined
  let source: SourceRef | undefined
  for await (const event of llm.stream({ ...request, messages: [...request.messages, ask] }, signal)) {
    if (event.type === 'done') ({ message: reply, usage, source } = event)
  }
  const verdict = parse(textOf(reply)) ?? { met: false, reason: 'The check gave no clear verdict; show evidence that the goal holds.' }
  return { ...verdict, reason: verdict.reason || (verdict.met ? 'The goal holds.' : 'The goal does not hold yet.'), usage, source }
}
