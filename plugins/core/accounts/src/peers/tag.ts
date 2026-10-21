import type { LLMEvent } from '../contract'
import type { RemotePc } from './remotes'

export async function* tagged(events: AsyncIterable<LLMEvent>, pc: RemotePc): AsyncGenerator<LLMEvent> {
  for await (const event of events) {
    if (event.type === 'done' && event.source) yield { ...event, source: { ...event.source, pc: pc.id, pcName: pc.name } }
    else yield event
  }
}
