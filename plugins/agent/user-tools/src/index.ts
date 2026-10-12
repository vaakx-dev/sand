import { joinDisposers } from '@sand/kit'
import type { Server } from '@sand/server/contract'
import type { ShellEnv } from '@sand/tools-shell/contract'
import { definePlugin, type Context } from 'drydock'
import { group } from './names'
import { notifyTool } from './notify/tool'
import { secretTool } from './secret/tool'
import { createVault } from './secret/vault'

const serveSecrets = (ctx: Context<'tools'>, server: Server, shellEnv: ShellEnv) => {
  const vault = createVault(shellEnv)
  return joinDisposers(
    ctx.tools.register(secretTool(vault)),
    server.handle('secret.answer', vault.answer),
    ctx.on('session.remove', session => vault.forget(session.id)),
    vault.close,
  )
}

export default definePlugin({
  name: 'user-tools',
  description: 'notify_user and request_secret: the agent tells the user something mid-turn, or asks for a secret its shell commands can use',
  inject: ['tools'],
  uses: {
    server: 'the agent cannot ask for secrets',
    shellEnv: 'the agent cannot ask for secrets',
  },
  apply(ctx) {
    ctx.effect(() =>
      ctx.tools.group({ name: group, label: 'User', summary: 'tell the user something without ending your turn, and ask them for a secret such as an API key', load: 'on-demand', mainOnly: true }),
    )
    ctx.effect(() => ctx.tools.register(notifyTool))
    ctx.watch('server', server => server && ctx.watch('shellEnv', shellEnv => shellEnv && serveSecrets(ctx, server, shellEnv)))
  },
})
