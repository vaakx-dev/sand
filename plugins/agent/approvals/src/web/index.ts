import { composer } from '@sand/composer/contract'
import { pcs, wire, wireHello } from '@sand/devices-contract'
import { place } from '@sand/layout/contract'
import { rail } from '@sand/rail/contract'
import { owned, pulse } from '@sand/reactive'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { derive, div, effect, sig } from '@vaakx-dev/vrui'
import { definePlugin, type Dispose } from 'drydock'
import { approvalMode, approvalRuleRemove, type ApprovalSettings, approvalSettings, approvalSettingsWire, approvalViews, type Mode } from '../contract'
import { approvalCards } from './card'
import { inboxSheet } from './inbox'
import { createModel } from './model'
import { approvalsPage } from './page'

const boxed = 'rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-800'

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

    ctx.provide(approvalViews, {
      card(owner, conversation) {
        const items = model.of(owner, conversation)
        return approvalCards(kit, model, items, boxed, div({ class: ['flex flex-col gap-2', () => (items.get().length ? 'pb-2' : 'hidden')] }))
      },
    })
    ctx.watch(
      composer,
      found =>
        found &&
        effect(() =>
          asking.get() ? found.slot('banner', () => approvalCards(kit, model, here, '', div({ class: 'flex flex-col gap-4 py-1' }))) : undefined,
        ),
    )

    let unplace: Dispose | undefined
    const close = () => {
      void unplace?.()
      unplace = undefined
    }
    const open = () => {
      unplace = place(ctx, 'overlay', () => inboxSheet({ kit, model, openThread: id => void ctx.threads.select(id) }, close), 100)
    }
    ctx.watch(rail, found =>
      found?.action({
        id: 'inbox',
        label: 'Inbox',
        icon: 'inbox',
        order: 90,
        count: () => model.all.get().length,
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
    ctx.watch(settings, found => found?.page({ id: 'approvals', label: 'Approvals', icon: 'shield', order: 24, render: () => approvalsPage(page) }))
  },
})
