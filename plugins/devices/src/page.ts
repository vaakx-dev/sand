import type { Machine } from '@sand/protocol'
import { div, dot, dynamicChild, errorMessage, keys, rowAction, secondaryAction, settingsRow, settingsSection, show, sig, span, textInput, type Pulse, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { linksBody } from './links'
import { deviceLinks } from './source'

const failed = (ctx: Context, error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

const linksSection = (ctx: Context<'wire'>, used: Sig<number>) =>
  settingsSection({ title: 'Connect a device' }, div({ class: 'bg-neutral-900 p-4' }, linksBody(deviceLinks(ctx, used))))

const machineRow = (ctx: Context, machine: Machine) =>
  settingsRow(
    span({ class: 'flex min-w-0 items-center gap-2' }, dot(machine.online ? 'success' : 'neutral'), span({ class: 'truncate' }, machine.name)),
    machine.local ? null : rowAction({ label: 'Remove', danger: true, run: () => void ctx.machines?.remove(machine.id).catch(error => failed(ctx, error)) }),
    machine.local ? 'This PC' : [machine.address, !machine.online && 'offline'].filter(Boolean).join(' · '),
  )

const pairRow = (ctx: Context) => {
  const link = sig('')
  const busy = sig(false)
  const pair = async () => {
    if (!link.get().trim() || busy.get()) return
    busy.set(true)
    try {
      await ctx.machines?.add(link.get().trim())
      link.set('')
    } catch (error) {
      failed(ctx, error)
    } finally {
      busy.set(false)
    }
  }
  return div(
    { class: 'flex flex-wrap items-center gap-2 bg-neutral-900 px-4 py-2' },
    textInput({ class: 'min-w-40 flex-1', placeholder: 'Link from another PC', bindValue: link, onKeyDown: keys({ Enter: () => void pair() }) }),
    secondaryAction({ disabled: () => busy.get() || !link.get().trim(), onClick: () => void pair() }, 'Pair'),
  )
}

const machinesSection = (ctx: Context, changes: Pulse) =>
  settingsSection(
    { title: 'PCs' },
    dynamicChild(changes.version, () => div({ class: 'contents' }, (ctx.machines?.list() ?? []).map(machine => machineRow(ctx, machine)))),
    pairRow(ctx),
  )

export const devicesPage = (ctx: Context<'wire'>, changes: Pulse, used: Sig<number>) =>
  div(
    { class: 'flex flex-col gap-6' },
    linksSection(ctx, used),
    show(
      changes.read(() => Boolean(ctx.machines)),
      () => machinesSection(ctx, changes),
    ),
  )
