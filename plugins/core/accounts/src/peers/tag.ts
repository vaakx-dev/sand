import type { LLMEvent } from '../contract'
import type { SharePc } from './pc'

type Done = Extract<LLMEvent, { type: 'done' }>

const ownedBy = (pc: SharePc, { source, native, ...done }: Done): Done => ({
  ...done,
  ...(source && { source: { ...source, pc: pc.id, pcName: pc.name } }),
  ...(native && { native: { ...native, pc: pc.id } }),
})

export async function* tagged(events: AsyncIterable<LLMEvent>, pc: SharePc): AsyncGenerator<LLMEvent> {
  for await (const event of events) yield event.type === 'done' ? ownedBy(pc, event) : event
}
