import { toastsOf } from '@sand/toasts/contract'
import type { Context } from 'drydock'

export const attempt = (ctx: Context, title: string, work: () => Promise<unknown> | void) => toastsOf(ctx).attempt(title, async () => work())
