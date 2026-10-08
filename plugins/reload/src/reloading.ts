import { evict, type Context, type ScopeView } from 'drydock'

const sourced = (scopes: Iterable<ScopeView>) => [...scopes].filter(scope => scope.kind === 'plugin' && scope.source)

export const reloadPlugin = async (ctx: Context, scope: ScopeView) => {
  const name = scope.name
  await ctx.reload(scope)
  const ok = scope.status !== 'failed'
  if (ok) ctx.ui?.notify(`↻ reloaded ${name}`)
  else ctx.ui?.notify(`✗ ${name} failed to reload`, 'error')
  ctx.emit('plugins.reloaded', { ok, names: [name] })
}

export const reloadAll = async (ctx: Context) => {
  const tops = sourced(ctx.scopes()).filter(scope => scope.parent?.kind === 'root')
  if (!tops.every(scope => scope.quiet())) ctx.ui?.notify('↻ reloading once running work finishes')
  await Promise.all(tops.map(scope => scope.idle()))
  for (const { source } of ctx.scopes()) if (source) evict(source.dir)
  await Promise.all(tops.map(scope => ctx.reload(scope)))
  await ctx.settled()
  const plugins = sourced(ctx.scopes())
  const failed = plugins.filter(scope => scope.status === 'failed').map(scope => scope.name)
  const summary = `↻ reloaded ${plugins.filter(scope => scope.status === 'active').length} plugins`
  if (failed.length) ctx.ui?.notify(`${summary}; failed: ${failed.join(', ')}`, 'error')
  else ctx.ui?.notify(summary)
  ctx.emit('plugins.reloaded', { ok: !failed.length, names: plugins.map(scope => scope.name) })
}
