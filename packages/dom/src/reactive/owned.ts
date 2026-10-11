import { collectScope, disposeAll } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const owned = <T>(ctx: Context, build: () => T): T => {
  const { value, scope } = collectScope(build)
  ctx.effect(() => () => disposeAll(scope))
  return value
}
