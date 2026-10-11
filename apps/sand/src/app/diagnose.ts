import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

const plugins = (ctx: Context) => ctx.scopes().filter(scope => scope.kind === 'plugin')

export const waitingPlugins = (ctx: Context) =>
  plugins(ctx)
    .filter(scope => scope.status === 'pending')
    .map(scope => `${scope.name} is waiting for: ${scope.missing().join(', ')}`)

export const failedPlugins = (ctx: Context) =>
  plugins(ctx)
    .filter(scope => scope.status === 'failed')
    .map(scope => `${scope.name} failed: ${errorMessage(scope.error)}`)

export const problems = (ctx: Context) => (ctx.ui ? [] : ['no plugin provides the ui role, so sand cannot talk to you', ...waitingPlugins(ctx)])
