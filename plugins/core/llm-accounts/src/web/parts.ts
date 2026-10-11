import { div, openTab, p, secondaryAction, type Child, type Sig } from '@sand/dom'

export const note = (text: string | (() => string)) => p({ class: 'text-xs text-neutral-400' }, text)

export const problem = (text: () => string) => p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !text() }, text)

export const actions = (...children: Child[]) => div({ class: 'flex flex-wrap items-center justify-end gap-2' }, ...children)

export const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return 'the sign-in page'
  }
}

export const openLink = (url: string, label = `Open ${hostOf(url)}`) =>
  secondaryAction({ size: 'sm', onClick: () => openTab(url) }, label)

export const whileBusy = async (busy: Sig<boolean>, work: () => Promise<void>) => {
  busy.set(true)
  try {
    await work()
  } finally {
    busy.set(false)
  }
}
