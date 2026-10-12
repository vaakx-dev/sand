import { errorText, openTab, secondaryAction, show, type Sig } from '@sand/dom'

export const problem = (text: () => string) => show(() => !!text(), () => errorText(text))

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
