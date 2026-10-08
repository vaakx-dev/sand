import { App } from './app/app'
import type { Context } from './context/types'

export * from './kernel'

export const createApp = (): Context => new App().root.ctx
