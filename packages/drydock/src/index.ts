import { App } from './app/app'
import type { Context } from './context/types'
import { bunLoader } from './source/bun'

export * from './kernel'
export { evict } from './source/evict'
export { share } from './source/share'

export const createApp = (): Context => new App(bunLoader).root.ctx
