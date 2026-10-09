export type RuntimeFrame = { type: 'result'; id: number } | { type: 'event'; name: string }

const resultHead = /^\{"type":"result","id":(-?\d+)[,}]/
const eventHead = /^\{"type":"event","name":"([^"\\]+)"/

const parsed = (raw: string): RuntimeFrame | undefined => {
  try {
    const message = JSON.parse(raw) as { type?: unknown; id?: unknown; name?: unknown }
    if (message.type === 'result' && typeof message.id === 'number') return { type: 'result', id: message.id }
    if (message.type === 'event' && typeof message.name === 'string') return { type: 'event', name: message.name }
  } catch {}
  return undefined
}

export const peek = (raw: string): RuntimeFrame | undefined => {
  const result = resultHead.exec(raw)
  if (result) return { type: 'result', id: Number(result[1]) }
  const event = eventHead.exec(raw)
  if (event) return { type: 'event', name: event[1] as string }
  return parsed(raw)
}
