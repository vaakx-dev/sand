import { pcsChange, wireHello } from '@sand/devices-contract'
import { pulse } from '@sand/web-client/reactive'
import type { PullsContext } from '../inject'

export const pairedPcs = (ctx: PullsContext) => pulse(ctx, [pcsChange, wireHello]).read(() => ctx.pcs.list())
