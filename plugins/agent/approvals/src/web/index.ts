import { composer } from '@sand/composer/contract'
import { pcs, wire, wireHello } from '@sand/devices-contract'
import { place } from '@sand/layout/contract'
import { rail } from '@sand/rail/contract'
import { owned, pulse } from '@sand/reactive'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { derive, div, effect, sig, type Derive } from '@vaakx-dev/vrui'
import { definePlugin, type Dispose } from 'drydock'
import { approvalMode, approvalRuleRemove, type ApprovalSettings, approvalSettings, approvalSettingsWire, approvalViews, type Mode } from '../contract'
import { approvalCards } from './card'
import { inboxSheet } from './inbox'
import { createModel, type Waiting } from './model'
import { approvalsPage } from './page'

export default definePlugin({
  name: 'approvals-web',
  description: 'Approval cards in the thread and bot chats, the Inbox of everything waiting on you, and the Approvals settings page',
  inject: { wire, pcs, kit, threads },
  apply(ctx) {
    const { kit } = ctx
    const model = owned(ctx, () => createModel(ctx, ctx))
    const thread = pulse(ctx, [threadSelect, threadsChange]).read(() => ctx.threads.current()?.id)
    const here = owned(ctx, () =>
      derive(() => model.all.get().filter(({ decision }) => decision.owner === 'thread' && decision.conversation === thread.get())),
    )
    const asking = owned(ctx, () => derive(() => here.get().length > 0))

    const cards = (items: Derive<Waiting[]>) => approvalCards(kit, model, items, '', div({ class: 'flex flex-col gap-4 py-1' }))

    ctx.provide(approvalViews, {
      banner(owner, conversation) {
        const items = model.of(owner, conversation)
        return { asking: () => items.get().length > 0, view: () => cards(items) }
      },
    })
    ctx.watch(composer, found => found && effect(() => (asking.get() ? found.slot('banner', () => cards(here)) : undefined)))

    let unplace: Dispose | undefined
    const opened = sig(false)
    const close = () => {
      void unplace?.()
      unplace = undefined
      opened.set(false)
    }
    const open = () => {
      unplace = place(ctx, 'overlay', () => inboxSheet({ kit, model, openThread: id => void ctx.threads.select(id) }, close), 100)
      opened.set(true)
    }
    ctx.watch(rail, found =>
      found?.action({
        id: 'inbox',
        label: 'Inbox',
        icon: 'inbox',
        order: 90,
        count: () => model.all.get().length,
        current: () => opened.get(),
        run: () => (unplace ? close() : open()),
      }),
    )

    const saved = sig<ApprovalSettings | undefined>(undefined)
    const keep = (call: Promise<ApprovalSettings>) =>
      void call.then(
        value => saved.set(value),
        () => {},
      )
    const load = () => keep(ctx.wire.call(approvalSettings, {}))
    ctx.on(wireHello, load)
    if (ctx.wire.ready()) load()
    ctx.effect(() => ctx.wire.on(approvalSettingsWire, value => saved.set(value)))
    const page = {
      kit,
      settings: saved,
      setMode: (mode: Mode) => keep(ctx.wire.call(approvalMode, { mode })),
      remove: (id: string) => keep(ctx.wire.call(approvalRuleRemove, { id })),
    }
    ctx.watch(settings, found => found?.page({ id: 'approvals', label: 'Approvals', icon: 'shield', group: 'agents', order: 24, render: () => approvalsPage(page) }))
  },
})
