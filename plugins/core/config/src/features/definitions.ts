import { z } from 'zod'
import type { FeatureDefinition } from '../contract'

const words = z
  .array(z.unknown())
  .catch([])
  .transform(items => items.filter(item => typeof item === 'string'))

const optionalText = z.string().optional().catch(undefined)

const definition = z
  .object({
    kind: z.enum(['feature', 'capability']).catch('feature'),
    label: z.string(),
    summary: z.string().catch(''),
    parent: optionalText,
    needs: words,
    uses: words,
    addon: z.boolean().catch(false),
    stops: optionalText,
  })
  .transform(({ parent, stops, ...rest }) => ({ ...rest, ...(parent !== undefined && { parent }), ...(stops !== undefined && { stops }) }))

const features = z.record(z.string(), z.unknown()).catch({})

const definitionOf = (id: string, value: unknown): FeatureDefinition[] => {
  const parsed = definition.safeParse(value)
  return parsed.success ? [{ id, ...parsed.data }] : []
}

export const featureOf = (sand: Record<string, unknown>) => (typeof sand.feature === 'string' ? sand.feature : undefined)

export const definitionsIn = (manifests: Record<string, unknown>[]) =>
  manifests.flatMap(sand => Object.entries(features.parse(sand.features)).flatMap(([id, value]) => definitionOf(id, value)))
