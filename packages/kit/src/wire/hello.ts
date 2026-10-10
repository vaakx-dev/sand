import type { Hello } from '@sand/protocol'

const fresh = new Set(['sessions', 'removed', 'sync', 'delta', 'active', 'started', 'jobs', 'asks', 'limits', 'tag', 'same'])

const pick = (hello: Hello, keep: boolean) => Object.fromEntries(Object.entries(hello).filter(([key]) => fresh.has(key) === keep))

export const helloParts = (hello: Hello) => ({ fresh: pick(hello, true) as Partial<Hello>, shared: pick(hello, false) as Partial<Hello> })
