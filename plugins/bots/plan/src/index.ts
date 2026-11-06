import { bots } from '@sand/bots/contract'
import type { Actor } from '@sand/host-hub/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { failure } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { planChangeWire, planRead, planWrite } from './contract'
import { offerPlanTools } from './tools'

export default definePlugin({
  name: 'bot-plan',
  description: "Keeps each bot's plan of its work as one Markdown file that the bot writes through its tools and the user can read and edit",
  inject: { bots },
  apply(ctx) {
    const botOf = (bot: string | undefined, actor: Actor | undefined) => {
      const id = bot ?? (actor?.owner === 'bot' ? actor.id : undefined)
      if (!id) throw failure('invalid_request', 'Name the bot')
      if (!ctx.bots.get(id)) throw failure('not_found', `No bot ${id}`)
      return id
    }

    const read = async (bot: string) => {
      const file = Bun.file(join(ctx.bots.folder(bot), 'plan.md'))
      return (await file.exists()) ? file.text() : ''
    }

    const write = async (bot: string, text: string) => {
      const folder = ctx.bots.folder(bot)
      await mkdir(folder, { recursive: true })
      await Bun.write(join(folder, 'plan.md'), text)
    }

    ctx.watch(mcpTools, found => found && offerPlanTools(found))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(planRead, ({ bot }, { actor }) => read(botOf(bot, actor))),
        found.handle(planWrite, async ({ bot, text }, { actor }) => {
          const id = botOf(bot, actor)
          await write(id, text)
          found.broadcast(planChangeWire, [id, text])
        }),
      )
    })
  },
})
