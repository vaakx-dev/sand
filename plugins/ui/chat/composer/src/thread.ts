import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { settingsSet, type EffectiveSettings, type SessionSettings, type SettingsPatch } from '@sand/model/contract'
import { modelButton } from '@sand/model-panel/contract'
import { pulse } from '@sand/reactive'
import { errorMessage } from '@sand/util'
import { models, modelsChange, outbox, outboxChange, threadChange, threadSelect } from '@sand/web-client/contract'
import type { ComposerContext } from './context'
import type { Model } from './model'
import { interrupt, modelMissing, sendDevice, submit } from './send/submit'
import type { Delivery, Target } from './target'

const deliveryOf = (ctx: ComposerContext): Delivery => {
  const pc = sendDevice(ctx)
  if (ctx.get(wire)?.ready(pc) ?? true) return 'now'
  return ctx.threads.current() && ctx.get(outbox)?.accepts(pc) ? 'queued' : 'unreachable'
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
  void ctx.get(wire)?.call(settingsSet, { session, patch }).catch(error => model.fail(errorMessage(error)))
}

export const threadTarget = (ctx: ComposerContext): Target => {
  const changes = pulse(ctx, [threadSelect, pcsChange, modelsChange, outboxChange], [wire, pcs, outbox])
  ctx.on(threadChange, id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })
  const running = changes.read(() => Boolean(ctx.threads.current()?.turn))
  const delivery = changes.read(() => deliveryOf(ctx))
  const pcName = changes.read(() => ctx.get(pcs)?.name(sendDevice(ctx)) ?? 'sand')
  const name = changes.read(() => ctx.threads.current()?.info.title || 'New chat')

  return {
    place: { device: () => sendDevice(ctx), thread: () => ctx.threads.current()?.id },
    running: () => running.get(),
    delivery: () => delivery.get(),
    pcName: () => pcName.get(),
    name: () => name.get(),
    path() {
      const thread = ctx.threads.current()
      return thread ? ctx.threads.path(thread.id) : []
    },
    ready(picked) {
      const button = ctx.get(modelButton)
      if (!button || !modelMissing(ctx, threadSettings(ctx, picked))) return true
      return !button.open()
    },
    send: (text, content, picked, options) => submit(ctx, text, content, threadSettings(ctx, picked), options),
    interrupt: () => interrupt(ctx),
  }
}
