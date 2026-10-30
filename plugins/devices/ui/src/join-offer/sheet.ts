import type { OutgoingJoin } from '@sand/devices-contract'
import { derive, div, dynamicChild, effect, sig, span, type Sig } from '@vaakx-dev/vrui'
import { type FoundPc, groupFound } from '../add/found'
import { othersThan } from '../add/joining'
import { joinedText, sourceWords } from '../add/words'
import { kindIcon, platformWords } from '../requests/words'
import { centered, doneBlock, heading } from '../shared/parts'
import { pinCode } from '../shared/pin'
import { leftWords } from '../shared/time'
import type { Ui } from '../ui'

type Offer = { step: 'offer' } | { step: 'wait'; join: OutgoingJoin } | { step: 'done'; title: string; text: string }

const foundRow = (ui: Ui, found: Sig<FoundPc>, join: (pc: FoundPc) => void, busy: Sig<boolean>) => {
  const { icon, primaryAction, settingsRow } = ui.kit
  const detail = () => [platformWords(found.get().platform), ...found.get().urls.map(url => sourceWords[url.via])].filter(Boolean).join(' · ')
  return settingsRow(
    { lead: span({ class: 'inline-flex text-neutral-400' }, icon(kindIcon('pc', found.get().platform), 'md')), title: () => found.get().name, detail },
    primaryAction({ disabled: busy, onClick: () => join(found.get()) }, 'Join'),
  )
}

export const joinOfferSheet = (ui: Ui, dismiss: () => void, close: () => void) => {
  const { overlay, primaryAction, quietButton, rowList, secondaryAction, settingsSection, sheet, sheetBody, sheetText, waitingLine } = ui.kit
  const state = sig<Offer>({ step: 'offer' })
  const busy = sig(false)
  const found = derive(() => groupFound(ui.data.joins.unpaired()))
  const here = () => ui.data.nameOf(ui.data.homeId())

  effect(() =>
    ui.data.joins.onResult((result, join) => {
      const current = state.get()
      if (current.step !== 'wait' || current.join.id !== result.id) return
      if (result.outcome !== 'approved') return state.set({ step: 'offer' })
      state.set({ step: 'done', title: `${here()} joined your PCs`, text: joinedText(othersThan(ui, ui.data.homeId()).concat(join?.name ?? [])) })
    }),
  )

  const join = async (pc: FoundPc) => {
    const [first] = pc.urls
    if (!first) return
    busy.set(true)
    const started = await ui.toasts.attempt(`Couldn’t ask ${pc.name} to let ${here()} in`, ui.data.joins.join(first.url, first.id))
    busy.set(false)
    if (started?.code) state.set({ step: 'wait', join: started })
  }

  const offerView = () =>
    div(
      { class: 'flex flex-col gap-4' },
      div(
        { class: 'flex flex-col gap-1' },
        heading(() => `Join ${found.get()[0]?.name ?? 'your'}’s PCs?`),
        sheetText('sand found your other PCs on this wifi. Join them to use their threads and accounts from here, and this PC from them.'),
      ),
      settingsSection({}, rowList(found, pc => pc.id, pc => foundRow(ui, pc, pc => void join(pc), busy))),
      div(quietButton({ class: '-ml-3', onClick: dismiss }, () => `Use ${here()} on its own`)),
    )

  const waitView = (pending: OutgoingJoin) =>
    centered(
      heading('Tap Allow on any of your devices'),
      sheetText('Your phone and browsers will ask. Check they show this code:'),
      div({ class: 'py-1' }, pinCode(pending.code)),
      waitingLine(() => `Waiting for Allow… ${leftWords(pending.expires, ui.data.now.get())}`),
      secondaryAction({ onClick: () => state.set({ step: 'offer' }) }, 'Cancel'),
    )

  const body = (current: Offer) => {
    if (current.step === 'wait') return waitView(current.join)
    if (current.step === 'done')
      return div({ class: 'flex flex-col items-center gap-4' }, doneBlock(ui.kit, current.title, current.text), primaryAction({ onClick: close }, 'Start a thread'))
    return offerView()
  }

  return overlay(close, sheet({ 'aria-label': 'Join your other PCs', size: 'md' }, sheetBody({ class: 'pt-4' }, dynamicChild(state, body))))
}
