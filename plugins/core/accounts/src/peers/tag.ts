import type { LLMEvent } from '../contract'
import type { SharePc } from './pc'

export async function* tagged(events: AsyncIterable<LLMEvent>, pc: SharePc): AsyncGenerator<LLMEvent> {
  for await (const event of events) {
    if (event.type === 'done' && event.source) yield { ...event, source: { ...event.source, pc: pc.id, pcName: pc.name } }
    else yield event
  }
}
