import { llm } from '@sand/accounts/contract'
import { noteBlock, sessions } from '@sand/chats/contract'
import { type Conversation, type ConversationRef, engine, type HoldStep, turnClose, turnHold, turnOpen, type TurnOrigin } from '@sand/engine/contract'
import { modelSettings } from '@sand/model/contract'
import { scheduleChange, scheduleRemove, schedules, type Schedule } from '@sand/schedules/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { turns } from '@sand/turns-contract/contract'
import { alternativeOf } from './alternative'
import { helloResumes, resumeAlternative, resumeCancel, resumesChange, resumeSwitch } from './contract'
import { createPlans } from './plans'

const CONTINUE = 'Usage is back. Continue where you left off.'

const switched = (account: string) => `Switched to ${account} because the plan ran out. Continue where you left off.`

export default definePlugin({
  name: 'usage-resume',
  description: 'Picks a chat back up when the usage its account ran out of resets, and holds what is sent to it until then',
  inject: { engine, schedules },
  apply(ctx) {
    const plans = createPlans(ctx.schedules)

    const announce = (schedule: Schedule) => {
      if (schedule.owner === plans.owner) ctx.get(server)?.broadcast(resumesChange, plans.list())
    }

    const resume = async (conversation: ConversationRef, key: string, note = CONTINUE) => {
      const sent = ctx.engine.send(conversation, { prompt: [noteBlock('sand', note)], origin: 'resume', clientRequestId: key })
      await sent?.catch(error => ctx.report(error))
    }

    const hold = (conversation: Conversation, origin: TurnOrigin, step: HoldStep) => {
      const found = plans.of(conversation)
      if (!found || origin === 'resume') return undefined
      if (!found.resume && origin === 'user' && step === 'send') plans.forget(conversation)
      return true
    }

    const stoppedThread = (turn: string) => {
      const info = ctx.engine.turn('thread', turn)
      const session = info && ctx.get(sessions)?.open(info.conversation)
      const latest = session && ctx.get(turns)?.list(session, undefined, 1)[0]
      return info && session && latest?.id === turn ? { info, session } : undefined
    }

    const alternative = ({ turn }: { turn: string }) => {
      const found = stoppedThread(turn)
      const models = ctx.get(llm)
      return found && models ? alternativeOf(models, found.info.selection.model) : undefined
    }

    const switchTo = async ({ turn, model }: { turn: string; model: string }) => {
      const found = stoppedThread(turn)
      const offered = alternative({ turn })
      if (!found || offered?.model !== model) throw new Error('This thread can no longer switch to that model')
      ctx.get(modelSettings)?.change(found.session, { model })
      await resume({ owner: 'thread', id: found.session.id }, `switch:${turn}`, switched(offered.account))
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
    ctx.watch(
      server,
      found =>
        found &&
        joinDisposers(
          found.hello(helloResumes, plans.list),
          found.handle(resumeCancel, ({ turn }) => plans.cancel(turn)),
          found.handle(resumeAlternative, alternative),
          found.handle(resumeSwitch, switchTo),
        ),
    )
  },
})
