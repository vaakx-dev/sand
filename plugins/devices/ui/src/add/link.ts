import { type OutgoingJoin, type PairLink, pairJoined } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, keys, sig } from '@vaakx-dev/vrui'
import { copyBox, field, note } from '../shared/parts'
import { pinCode } from '../shared/pin'
import type { Ui } from '../ui'
import type { AddDone } from './done'
import { othersThan } from './joining'
import { livePairLink } from './pair-link'
import { joinedText } from './words'

const pcUrl = (link: PairLink) => (link.links.find(share => share.route.kind === 'lan') ?? link.links[0])?.url

const minutesLeft = (link: PairLink) => Math.max(1, Math.round((link.expires - Date.now()) / 60_000))

const ownLink = (ui: Ui, link: PairLink | undefined, error: string, retry: () => void) => {
  const { errorState, loadingState } = ui.kit
  if (error) return errorState({ text: `Couldn’t make a link: ${error}`, retry })
  if (!link) return loadingState({})
  const url = pcUrl(link)
  if (!url) return errorState({ text: 'Other PCs can’t reach this one yet. Turn on Open to your network or Reach from anywhere first.' })
  return div({ class: 'flex flex-col gap-1.5' }, copyBox(ui.kit, url), note(`Works once, within ${minutesLeft(link)} minutes.`))
}

const waitingFor = (ui: Ui, join: OutgoingJoin) =>
  div({ class: 'flex flex-col gap-2' }, ui.kit.waitingLine(`Tap Allow on ${join.name}. Check it shows this code:`), pinCode(join.code, 'sm'))

export const linkStep = (ui: Ui, done: (result: AddDone) => void) => {
  const { errorText, secondaryAction, sheetText, textInput } = ui.kit
  const live = livePairLink(ui, 'pc')
  const pasted = sig('')
  const error = sig('')
  const busy = sig(false)
  const waiting = sig<OutgoingJoin | undefined>(undefined)

  effect(() =>
    ui.ctx.wire.on(pairJoined, ({ token, device }) => {
      if (token !== live.link.get()?.token) return
      live.used()
      done({ title: `${device.name} joined your PCs`, text: joinedText(othersThan(ui, device.id)) })
    }),
  )

  const connect = async () => {
    const url = pasted.get().trim()
    if (!url) return
    busy.set(true)
    error.set('')
    try {
      const join = await ui.data.joins.join(url)
      if (join.code) waiting.set(join)
    } catch (failure) {
      error.set(`Couldn’t connect: ${errorMessage(failure)}`)
    } finally {
      busy.set(false)
    }
  }

  return div(
    { class: 'flex flex-col gap-4' },
    sheetText('For a PC that isn’t found. Do this on one of the two PCs only.'),
    field(
      'Copy this link to the other PC',
      dynamicChild(
        derive(() => ({ link: live.link.get(), failed: live.error.get() })),
        ({ link, failed }) => ownLink(ui, link, failed, live.retry),
      ),
    ),
    field(
      'Or paste the other PC’s link',
      div(
        { class: 'flex gap-2' },
        textInput({ placeholder: 'Link from the other PC', 'aria-label': 'Link from the other PC', bindValue: pasted, onKeyDown: keys({ Enter: () => void connect() }) }),
        secondaryAction({ disabled: () => busy.get() || !pasted.get().trim(), onClick: () => void connect() }, 'Paste and connect'),
      ),
      dynamicChild(error, text => (text ? errorText(text) : null)),
      dynamicChild(waiting, join => (join ? waitingFor(ui, join) : null)),
    ),
  )
}
