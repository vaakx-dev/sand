export interface Captured {
  uuid: string
  event: string
  properties: Record<string, unknown>
  timestamp: string
}

export interface Target {
  key: string
  url: string
}

const timeout = 10_000

export const sendBatch = async (target: Target, distinctId: string, events: Captured[]) => {
  const response = await fetch(new URL('/batch/', target.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: target.key, batch: events.map(event => ({ ...event, distinct_id: distinctId })) }),
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`PostHog answered ${response.status}`)
}
