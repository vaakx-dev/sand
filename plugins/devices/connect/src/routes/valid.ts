import type { PublishedRoute } from '@sand/devices-contract'
import { routePrefsSchema } from '@sand/devices-contract'
import { lazy } from '@sand/util'
import { z } from 'zod'
import { validEntries } from '../saved/entries'

const directKinds = ['local', 'lan', 'tailscale'] as const

const routeSchema = lazy(() =>
  z.object({
    key: z.string(),
    kind: z.enum([...directKinds, 'via']),
    source: z.enum(['published', 'seed', 'added']),
    url: z.string().optional(),
    via: z.string().optional(),
  }),
)

const pcRoutesSchema = lazy(() => z.object({ routes: z.array(routeSchema()), prefs: routePrefsSchema() }))

const publishedRoutesSchema = lazy(() => z.array(z.object({ url: z.string(), kind: z.enum(directKinds) })))

const savedRoutes = (saved: unknown) => validEntries(saved, pcRoutesSchema())

const isPublishedRoutes = (value: unknown): value is PublishedRoute[] => publishedRoutesSchema().safeParse(value).success

export { isPublishedRoutes, savedRoutes }
