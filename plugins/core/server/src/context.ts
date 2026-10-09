import type { Context } from 'drydock'

export type ServerContext = Context<'cli' | 'sessions' | 'loop' | 'runtime'>
