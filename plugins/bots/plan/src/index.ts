import { botRemove, bots } from '@sand/bots/contract'
import type { Actor } from '@sand/host-hub/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { failure } from '@sand/orchestrator/contract'
import { promptSections } from '@sand/prompt/contract'
import { stepPrepare } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { planChangeWire, planRead, planWrite } from './contract'
import { planSection } from './prompt'
import { offerPlanTools } from './tools'

export default definePlugin({
  name: 'bot-plan',
  description:
    "Keeps each bot's plan of its work as one Markdown file that the bot writes through its tools and the user can read and edit, and keeps the plan in the bot's context, briefing it again when someone else changes it",
  inject: { bots },
  apply(ctx) {
    const seen = new Map<string, string>()

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
      await writeAtomic(join(folder, 'plan.md'), text)
    }

    const brief = async (bot: string) => {
      const text = await read(bot)
      seen.set(bot, text)
      return planSection(text)
    }

    const changedElsewhere = async (bot: string) => seen.get(bot) !== (await read(bot))

    ctx.on(promptSections, async (sections, conversation) =>
      conversation.owner === 'bot' && ctx.bots.get(conversation.id) ? [...sections, await brief(conversation.id)] : sections,
    )
    ctx.on(stepPrepare, async (_request, conversation) => (conversation.owner === 'bot' && (await changedElsewhere(conversation.id))) || undefined)
    ctx.on(botRemove, bot => void seen.delete(bot))
    ctx.watch(mcpTools, found => found && offerPlanTools(found))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(planRead, ({ bot }, { actor }) => read(botOf(bot, actor))),
        found.handle(planWrite, async ({ bot, text }, { actor }) => {
          const id = botOf(bot, actor)
          await write(id, text)
          if (actor?.owner === 'bot' && actor.id === id) seen.set(id, text)
          found.broadcast(planChangeWire, [id, text])
        }),
      )
    })
  },
})
