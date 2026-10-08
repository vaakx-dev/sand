import type { Context } from 'drydock'
import { existsSync } from 'node:fs'

export type ServerContext = Context<'cli' | 'sessions' | 'loop'>

export const folder = (ctx: ServerContext, cwd: string) => (existsSync(cwd) ? cwd : ctx.cli.cwd)
