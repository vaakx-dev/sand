import type { Context, ScopeView } from 'drydock'
import { describe } from './describe'
import { webOf, webOnly, webStates } from './web/match'
import { noBrowser, webDetail, webLine } from './web/text'

const plugins = (ctx: Context) => ctx.scopes().filter(scope => scope.kind === 'plugin')

const heading = (ctx: Context, scope: ScopeView) => describe(ctx, scope).split('\n')[0]

export const listPlugins = (ctx: Context) => {
  const scopes = plugins(ctx)
  const states = webStates(ctx)
  return [
    ...scopes.map(scope => {
      const web = webOf(scope, states)
      return web ? `${heading(ctx, scope)} | ${webLine(web)}` : heading(ctx, scope)
    }),
    ...webOnly(scopes, states).map(webLine),
    noBrowser(states),
  ]
    .filter(Boolean)
    .join('\n')
}

export const showPlugin = (ctx: Context, name: string) => {
  const states = webStates(ctx)
  const scope = plugins(ctx).find(candidate => candidate.name === name)
  const web = scope ? webOf(scope, states) : states.find(state => state.id === name)
  if (!scope && !web) throw new Error(`No plugin named ${name}`)
  return [scope && describe(ctx, scope), web && webDetail(web)].filter(Boolean).join('\n')
}
