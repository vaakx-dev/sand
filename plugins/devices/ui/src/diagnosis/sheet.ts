import { type PeerView, peersChange, peersList } from '@sand/devices-contract'
import { derive, div, dynamicChild, effect, span } from '@vaakx-dev/vrui'
import { feed } from '../data/feed'
import { toneDot } from '../status/dot'
import type { Ui } from '../ui'
import { type Advice, adviceOf } from './advice'
import { attemptsSection } from './attempts'
import type { Facts } from './facts'
import { diagnosticsText } from './report'
import { summaryOf } from './summary'

const summaryBox = (ui: Ui, facts: Facts) => {
  const { title, text, tone } = summaryOf(facts)
  return div(
    { class: 'flex items-start gap-3 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-neutral-100' },
    span({ class: 'inline-flex h-5 shrink-0 items-center' }, toneDot(ui.kit, () => tone, () => title)),
    div({ class: 'flex min-w-0 flex-col gap-1' }, span(title), text ? span({ class: 'text-xs text-neutral-400' }, text) : null),
  )
}

const adviceItem = (ui: Ui, advice: Advice, index: number) => {
  const { icon, secondaryAction } = ui.kit
  const { action } = advice
  return div(
    { class: 'flex gap-2 text-sm text-neutral-100' },
    span({ class: 'w-4 shrink-0 text-neutral-500 tabular-nums' }, `${index + 1}.`),
    div(
      { class: 'flex min-w-0 flex-col items-start gap-1.5' },
      span(advice.text),
      action ? secondaryAction({ size: 'sm', onClick: action.run }, action.label, action.external ? icon('external', 'sm') : null) : null,
    ),
  )
}

const adviceSection = (ui: Ui, facts: Facts) =>
  div({ class: 'flex flex-col gap-2' }, ui.kit.sectionHeading('What to try'), div({ class: 'flex flex-col gap-3 px-2' }, adviceOf(ui, facts).map((advice, index) => adviceItem(ui, advice, index))))

const homePeers = (ui: Ui) => {
  const peers = feed(() => ui.ctx.wire.call(peersList, {}), [] as PeerView[])
  effect(() => ui.ctx.wire.on(peersChange, list => peers.value.set(list)))
  void peers.refresh()
  return peers
}

export const diagnosisSheet = (ui: Ui, pc: string, close: () => void) => {
  const { copyText, icon, overlay, primaryAction, secondaryAction, sheet, sheetBody, sheetFoot, sheetHead } = ui.kit
  const { data } = ui
  const peers = homePeers(ui)
  const facts = derive((): Facts => {
    data.changes.version.get()
    const home = data.homeId()
    return {
      pc,
      name: data.nameOf(pc),
      device: ui.device(),
      home,
      homeName: data.nameOf(home),
      view: ui.ctx.pcs.get(pc),
      diagnosis: ui.ctx.pcs.diagnosis(pc),
      homeView: peers.value.get().find(peer => peer.id === pc),
      homeError: peers.error.get(),
      homeLan: data.home.network.value.get()?.routes.find(route => route.kind === 'lan')?.url,
      nameOf: data.nameOf,
    }
  })
  const copy = async () => {
    const copied = await copyText(diagnosticsText(facts.get()))
    if (copied) ui.toasts.ok('Diagnostics copied')
    else ui.toasts.fail('Couldn’t copy the diagnostics', new Error('the browser refused to write to the clipboard'))
  }
  const retry = () => {
    ui.ctx.pcs.retry(pc)
    void peers.refresh()
  }
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Why can’t I connect?', size: 'md' },
      sheetHead({ title: 'Why can’t I connect?', close }),
      sheetBody(
        {},
        dynamicChild(facts, current => div({ class: 'flex flex-col gap-4' }, summaryBox(ui, current), attemptsSection(ui, current), adviceSection(ui, current))),
      ),
      sheetFoot(
        secondaryAction({ onClick: () => void copy() }, icon('copy', 'sm'), 'Copy diagnostics'),
        span({ class: 'flex-1' }),
        primaryAction({ onClick: retry }, icon('reload', 'sm'), 'Retry now'),
      ),
    ),
  )
}
