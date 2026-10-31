import { pluginSwitches } from '@sand/config/contract'
import type { Context } from 'drydock'
import { describe, statusLine } from './describe'
import { webOf, webOnly, webStates } from './web/match'
import { noBrowser, webDetail, webLine } from './web/text'

const plugins = (ctx: Context) => ctx.scopes().filter(scope => scope.kind === 'plugin')

const turnedOff = (ctx: Context) => (ctx.get(pluginSwitches)?.off() ?? []).filter(plugin => !plugin.needs.length).map(plugin => plugin.id)

const offLine = (id: string) => `${id}: off (turned off in sand.toml)`

export const listPlugins = (ctx: Context) => {
  const scopes = plugins(ctx)
  const states = webStates(ctx)
  return [
    ...scopes.map(scope => {
      const web = webOf(scope, states)
      return web ? `${statusLine(ctx, scope)} | ${webLine(web)}` : statusLine(ctx, scope)
    }),
    ...webOnly(scopes, states).map(webLine),
    ...turnedOff(ctx).map(offLine),
    noBrowser(states),
  ]
    .filter(Boolean)
    .join('\n')
}

export const showPlugin = (ctx: Context, name: string) => {
  const states = webStates(ctx)
  const scope = plugins(ctx).find(candidate => candidate.name === name)
  const web = scope ? webOf(scope, states) : states.find(state => state.id === name)
  if (!scope && !web && turnedOff(ctx).includes(name)) return offLine(name)
  if (!scope && !web) throw new Error(`No plugin named ${name}`)
  return [scope && describe(ctx, scope), web && webDetail(web)].filter(Boolean).join('\n')
}
