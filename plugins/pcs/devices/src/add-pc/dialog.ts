import { choiceButton, choiceList, derive, div, doneMark, dynamicChild, icon, iconButton, overlay, p, primaryAction, sheet, sheetHead, show, sig, tile, untrack } from '@sand/dom'
import type { InstallProgress } from '@sand/host-dist/contract'
import type { Context } from 'drydock'
import { sheetBody } from '../components'
import type { DeviceSource } from '../source'
import { installStep } from './install'
import { installedName } from './progress'
import { joinStep } from './join'

export type AddPcMode = 'choose' | 'install' | 'join'

interface Done {
  title: string
  detail: string
}

const titles: Record<AddPcMode, string> = { choose: 'Add a PC', install: 'Install sand on the new PC', join: 'Connect a PC that has sand' }

const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

const chooseStep = (pick: (mode: AddPcMode) => void) =>
  choiceList(
    choiceButton({ mark: tile(icon('term', 16)), title: 'Install sand on it', detail: "For a PC that doesn't have sand yet", onClick: () => pick('install') }),
    choiceButton({ mark: tile(icon('link', 16)), title: 'It already has sand', detail: 'Connect with a pairing link', onClick: () => pick('join') }),
  )

const doneStep = (done: Done, close: () => void) =>
  div(
    { class: 'flex flex-col items-center gap-2 py-2 text-center' },
    doneMark(),
    p({ class: 'mt-1 text-base font-semibold text-neutral-100' }, done.title),
    p({ class: 'text-sm text-neutral-400' }, done.detail),
    div({ class: 'mt-3 flex justify-center' }, primaryAction({ onClick: close }, 'Done')),
  )

export const addPcDialog = (ctx: Context<'wire'>, source: DeviceSource, close: () => void, start: AddPcMode = 'choose') => {
  source.load()
  const mode = sig<AddPcMode>(start)
  const done = sig<Done | undefined>(undefined)
  const running = sig(false)
  const self = () => untrack(() => source.pcs.get()?.self.name) ?? 'this PC'

  const installed = (list: InstallProgress[]) => {
    const name = installedName(list) ?? 'The new PC'
    const accounts = list.at(-1)?.accounts ?? []
    done.set({ title: `${name} is ready`, detail: accounts.length ? `It can use ${listed(accounts)} from ${self()}.` : `It's paired with ${self()}.` })
  }
  const joined = (name: string) => done.set({ title: `Connected to ${name}`, detail: `${name} and ${self()} can now use each other's shared accounts.` })

  const body = (key: string) => {
    const finished = untrack(() => done.get())
    if (key === 'done' && finished) return doneStep(finished, close)
    if (key === 'install') return installStep(ctx, source, installed, running)
    if (key === 'join') return joinStep(ctx, source, joined)
    return chooseStep(next => mode.set(next))
  }

  return overlay(
    close,
    sheet(
      { 'aria-label': 'Add a PC', class: 'max-w-lg' },
      sheetHead(
        () => (done.get() ? '' : titles[mode.get()]),
        close,
        show(
          derive(() => mode.get() !== 'choose' && !done.get() && !running.get()),
          () => iconButton({ title: 'Back', onClick: () => mode.set('choose') }, icon('back')),
        ),
      ),
      sheetBody(
        dynamicChild(
          derive(() => (done.get() ? 'done' : mode.get())),
          body,
        ),
      ),
    ),
  )
}
