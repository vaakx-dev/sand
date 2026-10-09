import type { LLM, LLMRequest, Message, Usage } from '@sand/protocol'

export interface Verdict {
  met: boolean
  reason: string
  usage?: Usage
}

const instruction = (objective: string) => `Pause the work. You are now a separate reviewer deciding whether this goal is met:

<goal>
${objective}
</goal>

Judge the current state from the conversation above. The goal is met only when its end state fully holds now; progress, or following its process correctly so far, is not enough. The agent saying it is done is not proof: look for evidence such as command output, test results or file contents. If it is not met, say concretely what is still missing or unverified so the agent knows what to do next.

Do not call any tools. Reply with only a JSON object: {"met": true or false, "reason": "one or two sentences"}`

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
  for await (const event of llm.stream({ ...request, messages: [...request.messages, ask] }, signal)) {
    if (event.type === 'done') ({ message: reply, usage } = event)
  }
  const verdict = parse(textOf(reply)) ?? { met: false, reason: 'The check gave no clear verdict; show evidence that the goal holds.' }
  return { ...verdict, reason: verdict.reason || (verdict.met ? 'The goal holds.' : 'The goal does not hold yet.'), usage }
}
