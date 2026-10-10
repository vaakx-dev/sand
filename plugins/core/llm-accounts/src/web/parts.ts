import { div, hint, p, secondaryAction, span, type Child, type Sig } from '@sand/dom'

export const note = (text: string | (() => string)) => p({ class: 'text-xs text-neutral-400' }, text)

export const problem = (text: () => string) => p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !text() }, text)

export const hintRow = (text: string) => div({ class: 'bg-neutral-900' }, hint(text))

export const actions = (...children: Child[]) => div({ class: 'flex flex-wrap items-center justify-end gap-2' }, ...children)

export const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return 'the sign-in page'
  }
}

export const openLink = (url: string, label = `Open ${hostOf(url)}`) =>
  secondaryAction({ size: 'sm', onClick: () => void window.open(url, '_blank', 'noopener') }, label)

export const accountRowWith = (props: object, logo: Child, title: Child, detail: Child, ...controls: Child[]) =>
  div(
    { class: 'flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 bg-neutral-900 px-4 py-3', ...props },
    logo,
    div(
      { class: 'flex min-w-32 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
      span({ class: 'text-xs text-neutral-500' }, detail),
    ),
    controls.length ? div({ class: 'flex shrink-0 flex-wrap items-center gap-3' }, ...controls) : null,
  )

export const accountRow = (logo: Child, title: Child, detail: Child, ...controls: Child[]) => accountRowWith({}, logo, title, detail, ...controls)

export const whileBusy = async (busy: Sig<boolean>, work: () => Promise<void>) => {
  busy.set(true)
  try {
    await work()
  } finally {
    busy.set(false)
  }
}
