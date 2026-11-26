import { botRemove, bots } from '@sand/bots/contract'
import { systemParts } from '@sand/compaction/contract'
import type { Actor } from '@sand/host-hub/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { failure } from '@sand/orchestrator/contract'
import { promptSections } from '@sand/prompt/contract'
import { stepPrepare } from '@sand/provider-threads/contract'
import { server } from '@sand/server/contract'
import { joinDisposers, keyedSerial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { planChangeWire, planEdit, planLimit, planRead, type PlanChange } from './contract'
import { planSection, planSectionLength } from './prompt'
import { replaced } from './replace'
import { offerPlanTools } from './tools'

export default definePlugin({
  name: 'bot-plan',
  description:
    "Keeps each bot's plan of its work as one Markdown file that the bot writes through its tools and the user can read and edit, and keeps the plan in the bot's context, briefing it again when someone else changes it",
  inject: { bots },
  apply(ctx) {
    const seen = new Map<string, string>()
    const oneAtATime = keyedSerial()

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

    const nextPlan = (before: string, change: PlanChange) => {
      const next = 'text' in change ? change.text : replaced(before, change.edits)
      if (next.length > planLimit) throw failure('invalid_request', `The plan would be ${next.length.toLocaleString('en')} characters; the limit is ${planLimit.toLocaleString('en')}`)
      return next
    }

    const knowsResult = (bot: string, before: string, change: PlanChange, actor: Actor | undefined) =>
      actor?.owner === 'bot' && actor.id === bot && ('text' in change || seen.get(bot) === before)

    const edit = (change: PlanChange, actor: Actor | undefined) => {
      const id = botOf(change.bot, actor)
      return oneAtATime(id, async () => {
        const before = await read(id)
        const next = nextPlan(before, change)
        await write(id, next)
        if (knowsResult(id, before, change, actor)) seen.set(id, next)
        return { id, next }
      })
    }

    ctx.on(promptSections, async (sections, conversation) =>
      conversation.owner === 'bot' && ctx.bots.get(conversation.id) ? [...sections, await brief(conversation.id)] : sections,
    )
    ctx.on(stepPrepare, async (_request, conversation) => (conversation.owner === 'bot' && (await changedElsewhere(conversation.id))) || undefined)
    ctx.on(botRemove, bot => void seen.delete(bot))
    ctx.watch(systemParts, found => found?.add({ name: 'Plan', tone: 'danger', chars: planSectionLength }))
    ctx.watch(mcpTools, found => found && offerPlanTools(found))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(planRead, ({ bot }, { actor }) => read(botOf(bot, actor))),
        found.handle(planEdit, async (change, { actor }) => {
          const { id, next } = await edit(change, actor)
          found.broadcast(planChangeWire, [id, next])
        }),
      )
    })
  },
})
