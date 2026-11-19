import { llm, llmLimits } from '@sand/accounts/contract'
import { noteBlock, type Session, sessions } from '@sand/chats/contract'
import { type Conversation, type ConversationRef, engine, type HoldStep, turnClose, turnHold, turnOpen, type TurnInfo, type TurnOrigin, type TurnResult } from '@sand/engine/contract'
import { modelSettings, type Selection } from '@sand/model/contract'
import { scheduleChange, scheduleRemove, schedules, type Schedule } from '@sand/schedules/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { turns } from '@sand/turns-contract/contract'
import { accountPool } from '@sand/account-pool/contract'
import { alternativeOf } from './alternative'
import { type Alternative, carrying, helloResumes, resumeAlternative, resumeCancel, resumesChange, resumeSwitch } from './contract'
import { createPlans } from './plans'

const CONTINUE = 'Usage is back. Continue where you left off.'

const switched = (account: string) => `Switched to ${account} because the plan ran out. Continue where you left off.`

const PICK_UP = 'Continue where you left off.'

type Next = { kind: 'carry'; note: string } | { kind: 'wait'; at: number }

const MOVED = 'Moved to another account on this plan because this one ran out of usage. Continue where you left off.'

export default definePlugin({
  name: 'usage-resume',
  description: 'Carries a chat on with the same model on another plan account when its account runs out of usage or its PC drops off mid-reply; with none, picks it back up when the usage resets, and holds what is sent to it until then',
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

    const usageBack = (conversation: Conversation, turn: string) => {
      const selection = ctx.engine.turn(conversation.owner, turn)?.selection
      return !!selection && !!ctx.get(accountPool)?.spare({ model: selection.model, source: '' })
    }

    const hold = (conversation: Conversation, origin: TurnOrigin, step: HoldStep) => {
      const found = plans.of(conversation)
      if (!found || origin === 'resume') return undefined
      if (!found.resume && (usageBack(conversation, found.turn) || (origin === 'user' && step === 'send'))) plans.forget(conversation)
      return true
    }

    const release = () =>
      plans.waiting().forEach(found => {
        const conversation = ctx.engine.open(found)
        const session = ctx.get(sessions)?.open(found.id)
        const first = session && ctx.get(turns)?.pending(session)[0]
        if (!conversation || !session || !first || !usageBack(conversation, found.turn)) return
        plans.forget(found)
        ctx.get(turns)?.hold(session, first.id, false)
      })

    const stoppedChat = (turn: string) => {
      const chats = ctx.get(turns)
      const info = chats?.get(turn)
      const session = info && ctx.get(sessions)?.open(info.session)
      const latest = session && chats?.list(session, undefined, 1)[0]
      return info && session && latest?.id === turn ? { info, session } : undefined
    }

    const alternative = ({ turn }: { turn: string }) => {
      const found = stoppedChat(turn)
      const models = ctx.get(llm)
      return found && models ? alternativeOf(models, found.info.selection.model) : undefined
    }

    const move = (session: Session, offered: Alternative, key: string) => {
      ctx.get(modelSettings)?.change(session, { model: offered.model })
      return resume({ owner: session.owner, id: session.id }, key, switched(offered.account))
    }

    const switchTo = async ({ turn, model }: { turn: string; model: string }) => {
      const found = stoppedChat(turn)
      const offered = alternative({ turn })
      if (!found || offered?.model !== model) throw new Error('This chat can no longer switch to that model')
      await move(found.session, offered, `switch:${turn}`)
    }

    const nextOf = ({ stopReason, resetsAt }: Pick<TurnResult, 'stopReason' | 'resetsAt'>, selection: Selection): Next | undefined => {
      if (stopReason === 'reloaded') return { kind: 'carry', note: PICK_UP }
      if (stopReason !== 'moved' && stopReason !== 'limited') return undefined
      if (ctx.get(accountPool)?.spare(selection)) return { kind: 'carry', note: stopReason === 'moved' ? PICK_UP : MOVED }
      if (stopReason === 'moved') return undefined
      const at = Math.min(resetsAt ?? Infinity, ctx.get(accountPool)?.backAt(selection) ?? Infinity)
      return Number.isFinite(at) && at > Date.now() ? { kind: 'wait', at } : undefined
    }

    const carryOn = (conversation: Conversation, result: TurnResult, turn: TurnInfo) => {
      const next = nextOf(result, turn.selection)
      if (next?.kind === 'carry') void resume({ owner: conversation.owner, id: conversation.id }, `carry-on:${turn.id}`, next.note)
      if (next?.kind === 'wait') plans.plan({ owner: conversation.owner, id: conversation.id, turn: turn.id, resume: true, at: next.at })
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
    ctx.on(turnClose, carryOn)
    ctx.provide(carrying, { continues: (result, selection) => nextOf(result, selection) !== undefined })
    ctx.on(turnHold, hold)
    ctx.on(llmLimits, release)
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
