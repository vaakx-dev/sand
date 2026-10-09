import { manifestRoute } from './manifest'
import { workerRoute } from './worker'

export const pwaRoutes = {
  '/manifest.webmanifest': manifestRoute,
  '/sw.js': workerRoute,
}
