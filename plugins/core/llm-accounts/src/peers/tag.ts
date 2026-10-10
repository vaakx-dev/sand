import type { LLMEvent, SourceRef } from '../contract'
import type { RemotePc } from './remotes'

export async function* tagged(events: AsyncIterable<LLMEvent>, pc: RemotePc, shared?: SourceRef): AsyncGenerator<LLMEvent> {
  for await (const event of events) {
    if (event.type !== 'done') {
      yield event
      continue
    }
    const own = event.source ?? shared
    yield own ? { ...event, source: { ...own, pc: pc.id, pcName: pc.name } } : event
  }
}
