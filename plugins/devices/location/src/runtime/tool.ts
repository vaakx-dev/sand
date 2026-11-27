import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Located } from './ask'

interface Named extends Located {
  name?: string
}

const group = { name: 'location', label: 'Location', summary: "the user's current location, from their phone or a browser running sand", load: 'on-demand' } as const

const input = z.object({})

const source = ({ name, kind }: Named) => (name ? `${name} (${kind})` : `a ${kind}`)

const described = (named: Named) => {
  const { latitude, longitude, accuracyMeters } = named.fix
  return `Location from ${source(named)}: latitude ${latitude}, longitude ${longitude}, accurate to ${Math.round(accuracyMeters)} m.`
}

const unavailable = (waitMs: number) =>
  `Location unavailable: no phone or browser running sand shared a location within ${Math.round(waitMs / 1000)} seconds. The user can open sand on their phone and allow location.`

const locationTool = (locate: (signal: AbortSignal) => Promise<Named | undefined>, waitMs: number): Tool<typeof input> => ({
  name: 'location',
  group: group.name,
  description: "Get the user's current location: latitude, longitude and accuracy, from their phone, or from a browser running sand when no phone answers",
  input,
  effect: 'read',
  async run(_, { signal }) {
    const named = await locate(signal)
    return named ? described(named) : unavailable(waitMs)
  },
})

export { group, locationTool }
