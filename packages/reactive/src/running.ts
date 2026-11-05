import type { Context } from 'drydock'

export const running = (ctx: Context) => ctx.scope.status === 'starting' || ctx.scope.status === 'active'
