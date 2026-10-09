import { div, p, secondaryAction, sig, span, type Child } from '@sand/dom'

export type Busy = ReturnType<typeof sig<boolean>>

export const note = (text: string | (() => string)) => p({ class: 'text-xs text-neutral-400' }, text)

export const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return 'the sign-in page'
  }
}

export const openLink = (url: string, label = `Open ${hostOf(url)}`) =>
  secondaryAction({ size: 'sm', onClick: () => void window.open(url, '_blank', 'noopener') }, label)

export const accountRow = (logo: Child, title: Child, detail: Child, ...controls: Child[]) =>
  div(
    { class: 'flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 bg-neutral-900 px-4 py-3' },
    logo,
    div(
      { class: 'flex min-w-32 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
      span({ class: 'text-xs text-neutral-500' }, detail),
    ),
    controls.length ? div({ class: 'flex shrink-0 flex-wrap items-center gap-3' }, ...controls) : null,
  )

export const busyAction = (busy: Busy, run: () => Promise<void>) => async () => {
  busy.set(true)
  try {
    await run()
  } finally {
    busy.set(false)
  }
}
