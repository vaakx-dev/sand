import type { Context } from 'drydock'

export const lookupEpoch = (ctx: Context) => {
  let epoch = 0
  const bump = () => void epoch++
  for (const name of ['projects.change', 'machines.change', 'branches.change', 'worktrees.change', 'wire.hello'] as const) ctx.on(name, bump)
  ctx.watch('projects', bump)
  ctx.watch('machines', bump)
  ctx.watch('branches', bump)
  ctx.watch('worktrees', bump)
  return () => epoch
}
