import { derive, div, dynamicChild, effect, errorMessage, keys, p, secondaryAction, sig, textInput } from '@sand/dom'
import type { Context } from 'drydock'
import { inviteBody } from '../pair/links'
import { pairInvite, type DeviceSource } from '../source'

const note = (text: string) => p({ class: 'text-xs text-neutral-400' }, text)

const pasteRow = (source: DeviceSource, joined: (name: string) => void) => {
  const link = sig('')
  const busy = sig(false)
  const error = sig('')
  const connect = async () => {
    if (busy.get() || !link.get().trim()) return
    busy.set(true)
    error.set('')
    try {
      joined((await source.addPc(link.get().trim())).name)
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }
  return div(
    { class: 'flex flex-col gap-2 border-t border-solid border-neutral-700 pt-4' },
    note('Or paste a link from the other PC'),
    div(
      { class: 'flex items-center gap-2' },
      textInput({ class: 'bg-neutral-900', placeholder: 'Link from the other PC', 'aria-label': 'Link from the other PC', bindValue: link, onKeyDown: keys({ Enter: () => void connect() }) }),
      secondaryAction({ disabled: () => busy.get() || !link.get().trim(), onClick: () => void connect() }, () => (busy.get() ? 'Connecting…' : 'Connect')),
    ),
    p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !error.get() }, () => error.get()),
  )
}

export const joinStep = (ctx: Context<'wire'>, source: DeviceSource, joined: (name: string) => void) => {
  const shown = new Set<number>()
  const { invite, error } = pairInvite(ctx, source.epoch, shown)
  effect(() => {
    const off = ctx.on('wire.event', event => {
      if (event.name !== 'pair.used' || event.args[0].kind !== 'pc' || !shown.has(event.args[1])) return
      joined(event.args[0].name)
    })
    return () => void off()
  })
  const listen = async () => {
    try {
      await source.setLan(true)
    } catch (failure) {
      source.fail(failure)
    }
  }
  return div(
    { class: 'flex flex-col gap-4' },
    note('On the other PC, open Settings → Your devices → Add a PC → It already has sand, and paste this link there.'),
    dynamicChild(derive(() => ({ current: invite.get(), failure: error.get() })), ({ current, failure }) => {
      if (current) return inviteBody(current, listen, 'pc')
      return note(failure ? `Couldn't create a link: ${errorMessage(failure)}` : 'Creating a link…')
    }),
    pasteRow(source, joined),
  )
}
