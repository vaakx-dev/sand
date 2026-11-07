import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { computers } from '@sand/computers/contract'
import { notify } from '@sand/devices-notify/contract'
import { type ConversationRef, toolContent } from '@sand/engine/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { oneLine } from '@sand/util'
import { openVault } from '@sand/vault'
import { definePlugin } from 'drydock'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { logins, loginsWire } from './contract'
import { responsibleFor } from './responsible'
import { serveLogins } from './serve'
import { createLogins, type Data } from './service'
import { codeTool } from './tools/code'
import { group, type ToolDeps } from './tools/deps'
import { fillTool } from './tools/fill'
import { listTool } from './tools/list'
import { secretTool } from './tools/secret'
import { type CodeAnswer, createWaits, type SecretAnswer } from './waits'

const noticeChars = 180

export default definePlugin({
  name: 'logins',
  description:
    'Saved logins: keeps website logins and keys encrypted or points at them in Bitwarden or 1Password, fills them into the browser or a command for the bots and threads allowed to use them, logs every use and blanks their values out of tool results',
  inject: { paths, tools, sessions },
  config: z
    .object({
      keychain: z.boolean().default(true),
      bw: z.string().min(1).default('bw'),
      bws: z.string().min(1).default('bws'),
      op: z.string().min(1).default('op'),
    })
    .prefault({}),
  async apply(ctx, { keychain, bw, bws, op }) {
    await rm(join(ctx.paths.home, 'secrets'), { recursive: true, force: true }).catch(error => ctx.report(error))
    const vault = await openVault<Data>(ctx.paths.home, 'logins', keychain && Bun.env.SAND_KEYCHAIN !== 'off' ? Bun.secrets : undefined)
    const title = ({ owner, id }: ConversationRef) => (owner === 'thread' ? ctx.sessions.open(id)?.title : ctx.get(bots)?.get(id)?.name) || id
    const runtime = createLogins(vault, await vault.read(), {
      commands: { bitwarden: bw, 'bitwarden-secrets': bws, '1password': op },
      responsible: responsibleFor(ctx.sessions, () => ctx.get(orchestrator)),
      title,
      changed: () => ctx.get(server)?.broadcast(loginsWire, runtime.state()),
    })
    const asks = { secrets: createWaits<SecretAnswer>(), codes: createWaits<CodeAnswer>() }
    ctx.effect(() => () => {
      asks.secrets.cancel()
      asks.codes.cancel()
    })
    ctx.provide(logins, runtime.service)
    ctx.on(toolContent, content => content.map(block => (block.type === 'text' ? { ...block, text: runtime.service.redact(block.text) } : block)))
    serveLogins(ctx, runtime, asks)

    const deps: ToolDeps = {
      logins: runtime,
      sessions: ctx.sessions,
      computers: () => ctx.get(computers),
      ...asks,
      needs: (conversation, text) =>
        void ctx
          .get(notify)
          ?.send({
            kind: 'needs',
            ...(conversation.owner === 'thread' ? { thread: conversation.id } : { bot: conversation.id }),
            title: title(conversation),
            text: oneLine(text, noticeChars),
          })
          .catch(error => ctx.report(error)),
    }
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Saved logins', summary: "use the user's saved website logins and keys without seeing them", load: 'always' }))
    for (const tool of [listTool(deps), fillTool(deps), codeTool(deps), secretTool(deps)]) ctx.effect(() => ctx.tools.register(tool))
  },
})
