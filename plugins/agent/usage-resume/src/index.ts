import { noteBlock } from '@sand/chats/contract'
import { type Conversation, type ConversationRef, engine, type HoldStep, turnClose, turnHold, turnOpen, type TurnOrigin } from '@sand/engine/contract'
import { scheduleChange, scheduleRemove, schedules, type Schedule } from '@sand/schedules/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { helloResumes, resumeCancel, resumesChange } from './contract'
import { createPlans } from './plans'

const CONTINUE = 'Usage is back. Continue where you left off.'

export default definePlugin({
  name: 'usage-resume',
  description: 'Picks a chat back up when the usage its account ran out of resets, and holds what is sent to it until then',
  inject: { engine, schedules },
  apply(ctx) {
    const plans = createPlans(ctx.schedules)

    const announce = (schedule: Schedule) => {
      if (schedule.owner === plans.owner) ctx.get(server)?.broadcast(resumesChange, plans.list())
    }

    const resume = async (conversation: ConversationRef, key: string) => {
      const sent = ctx.engine.send(conversation, { prompt: [noteBlock('sand', CONTINUE)], origin: 'resume', clientRequestId: key })
      await sent?.catch(error => ctx.report(error))
    }

    const hold = (conversation: Conversation, origin: TurnOrigin, step: HoldStep) => {
      const found = plans.of(conversation)
      if (!found || origin === 'resume') return undefined
      if (!found.resume && origin === 'user' && step === 'send') plans.forget(conversation)
      return true
    }

    ctx.effect(() =>
      ctx.schedules.handle(plans.owner, async (schedule, fire) => {
        const found = plans.plannedOf(schedule.data)
        if (found.resume) await resume(found, fire.key)
      }),
    )
    ctx.on(scheduleChange, announce)
    ctx.on(scheduleRemove, announce)
    ctx.on(turnOpen, conversation => plans.forget(conversation))
    ctx.on(turnClose, (conversation, { stopReason, resetsAt }, turn) => {
      if (stopReason === 'limited' && resetsAt && resetsAt > Date.now()) plans.plan({ owner: conversation.owner, id: conversation.id, turn: turn.id, resume: true, at: resetsAt })
    })
    ctx.on(turnHold, hold)
    ctx.watch(server, found => found && joinDisposers(found.hello(helloResumes, plans.list), found.handle(resumeCancel, ({ turn }) => plans.cancel(turn))))
  },
})
