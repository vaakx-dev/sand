import { pcs, pcsChange, wire } from '@sand/devices-contract'
import type { EffectiveSettings, SessionSettings, SettingsPatch } from '@sand/model/contract'
import { modelButton } from '@sand/model-panel/contract'
import { threadUpdate } from '@sand/orchestrator/contract'
import { pulse } from '@sand/reactive'
import { errorMessage } from '@sand/util'
import { draftStarted, models, modelsChange, outbox, outboxChange, threadChange, threadSelect } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from './context'
import type { ChatRef } from './contract'
import type { Model } from './model'
import { destination, interrupt, modelMissing, sendDevice, stoppable, submit } from './send/submit'
import type { Delivery, Destination, Target } from './target'

const deliveryOf = (ctx: ComposerContext): Delivery => {
  const pc = sendDevice(ctx)
  if (ctx.get(wire)?.ready(pc) ?? true) return 'now'
  return ctx.threads.current() && ctx.get(outbox) ? 'queued' : 'unreachable'
}

export const threadSettings = (ctx: ComposerContext, picked: SessionSettings): SessionSettings => {
  const known = ctx.get(models)
  const usable = Boolean(picked.model && known?.info(picked.model))
  return { ...known?.defaults(), ...(usable && picked) }
}

const plain = ({ model, effort, speed }: EffectiveSettings): SessionSettings => ({ ...(model && { model }), ...(effort && { effort }), speed })

export const nextSettings = (ctx: ComposerContext, picked: SessionSettings): SessionSettings => {
  const thread = ctx.threads.current()
  const state = thread && ctx.get(models)?.state(thread.id)
  if (!state) return threadSettings(ctx, picked)
  return plain(state.next ?? state.current)
}

export const chooseSettings = (ctx: ComposerContext, model: Model) => (patch: SettingsPatch) => {
  const session = ctx.threads.current()?.id
  if (!session) return model.choose(patch)
  void ctx.get(wire)?.call(threadUpdate, { session, ...patch }).catch(error => model.fail(errorMessage(error)))
}

export const threadTarget = (ctx: ComposerContext): Target => {
  const changes = pulse(ctx, [threadSelect, pcsChange, modelsChange, outboxChange], [wire, pcs, outbox])
  ctx.on(threadChange, id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })
  const started = sig(new Map<string, string>())
  ctx.on(draftStarted, (draft, thread) => started.update(known => new Map(known).set(draft, thread)))
  const threadOf = (to: Destination) => (to.draft ? started.get().get(to.draft.id) : to.conversation)
  const running = changes.read(() => Boolean(ctx.threads.current()?.turn))
  const stopping = changes.read(() => stoppable(ctx.threads.current()))
  const delivery = changes.read(() => deliveryOf(ctx))
  const pcName = changes.read(() => ctx.get(pcs)?.name(sendDevice(ctx)) ?? 'sand')
  const name = changes.read(() => ctx.threads.current()?.info.title || 'New chat')
  const chat = changes.read((): ChatRef | undefined => {
    const id = ctx.threads.current()?.id
    return id ? { owner: 'thread', id, pc: sendDevice(ctx) } : undefined
  })

  return {
    place: { device: () => sendDevice(ctx), thread: () => ctx.threads.current()?.id },
    running: () => running.get(),
    stoppable: () => stopping.get(),
    delivery: () => delivery.get(),
    pcName: () => pcName.get(),
    name: () => name.get(),
    chat: () => chat.get(),
    conversation: () => ctx.threads.current()?.id ?? ctx.threads.drafting()?.id,
    path() {
      const thread = ctx.threads.current()
      return thread ? ctx.threads.path(thread.id) : []
    },
    ready(picked) {
      const button = ctx.get(modelButton)
      if (!button || !modelMissing(ctx, threadSettings(ctx, picked))) return true
      return !button.open()
    },
    destination: () => destination(ctx),
    shownIn: to => threadOf(to) ?? to.conversation,
    deliver: (to, message) => submit(ctx, threadOf(to), to, { ...message, settings: threadSettings(ctx, message.settings) }),
    interrupt: () => interrupt(ctx),
  }
}
