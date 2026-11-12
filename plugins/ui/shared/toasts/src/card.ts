import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, effect, onTimeout, sig } from '@vaakx-dev/vrui'
import type { Toast } from './contract'
import { isSticky, type Entry } from './model'
import { actionButton, bannerTone, outputBlock } from './parts'

const autoDismissMs = 6000

const autoDismiss = (entry: Entry, paused: () => boolean, dismiss: () => void) =>
  effect(() => {
    if (isSticky(entry.toast.get()) || paused()) return
    onTimeout(dismiss, autoDismissMs)
  })

const toastBanner = (kit: Kit, { tone, title, detail, output, actions = [] }: Toast, dismiss: () => void) =>
  kit.banner(
    {
      tone: bannerTone[tone],
      title,
      ...(detail && { detail }),
      actions: actions.map(action => actionButton(kit, action, dismiss)),
      dismiss,
      class: 'shadow-xl',
    },
    ...(output ? [outputBlock(kit, output)] : []),
  )

export const toastCard = (kit: Kit, entry: Entry, dismiss: () => void) => {
  const hovered = sig(false)
  const focused = sig(false)
  autoDismiss(entry, () => hovered.get() || focused.get(), dismiss)
  return div(
    {
      class: 'pointer-events-auto max-w-md animate-rise',
      onMouseEnter: () => hovered.set(true),
      onMouseLeave: () => hovered.set(false),
      onFocusIn: () => focused.set(true),
      onFocusOut: () => focused.set(false),
    },
    dynamicChild(entry.toast, toast => toastBanner(kit, toast, dismiss)),
  )
}
