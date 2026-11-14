import type { ImageBlock } from '@sand/chats/contract'
import type { ToolViews } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { clock, derive, div, dynamicChild, media, span } from '@vaakx-dev/vrui'
import { sceneNames, type Theme, themeName, type ThemeTrialEntry } from '../../contract'
import type { ThemeModel } from '../model'
import { swatchMark } from '../settings/swatch'

const sameTheme = (one: Theme | null, two: Theme | null) => JSON.stringify(one) === JSON.stringify(two)

const countdown = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const shot = (views: ToolViews, thread: string, block: ImageBlock | undefined, label: string, height: number) =>
  block
    ? div(
        { class: 'flex min-w-0 shrink flex-col gap-1.5' },
        views.image(block, thread, { class: 'block w-auto max-w-full rounded-md ring-1 ring-neutral-700', maxHeight: height, alt: `${label} screenshot`, props: { style: { height: `${height}px` } } }),
        span({ class: 'text-xs text-neutral-500' }, label),
      )
    : null

export const trialCard = (kit: Kit, views: ToolViews, model: ThemeModel, entry: ThemeTrialEntry, thread: string) => {
  const narrow = media('(max-width: 767px)')
  const now = clock(500)
  const live = derive(() => model.state.get()?.trial?.id === entry.trial)
  const left = derive(() => (live.get() ? (model.state.get()?.trial?.until ?? 0) - now.get() : 0))
  const kept = derive(() => !live.get() && sameTheme(model.saved.get(), entry.theme))
  const back = themeName(entry.previous)
  const scene = entry.theme.scene ? sceneNames[entry.theme.scene] : undefined

  const status = () => {
    if (live.get()) return narrow.get() ? `Goes back in ${countdown(left.get())} unless kept` : [scene, `goes back to ${back} in ${countdown(left.get())} unless you keep it`].filter(Boolean).join(' · ')
    if (kept.get()) return 'Kept · on across sand'
    return `Not kept · went back to ${back}`
  }

  return div(
    { class: 'chat-row my-3 flex flex-col gap-3 rounded-xl bg-neutral-800 p-3', 'data-theme-trial': entry.trial },
    entry.desktop || entry.phone
      ? dynamicChild(narrow, isNarrow =>
          div({ class: 'flex items-end gap-3' }, shot(views, thread, entry.desktop, 'Desktop', isNarrow ? 132 : 200), shot(views, thread, entry.phone, 'Phone', isNarrow ? 132 : 200)),
        )
      : null,
    div(
      { class: 'flex flex-wrap items-center gap-x-3 gap-y-2' },
      div(
        { class: 'flex min-w-0 flex-1 flex-col gap-1' },
        kit.rowName(entry.theme.name),
        div({ class: 'flex min-w-0 items-center gap-1.5' }, swatchMark(() => entry.theme.base, 'h-3 w-3'), swatchMark(() => entry.theme.accent, 'h-3 w-3'), kit.metaLine(status)),
      ),
      div(
        { class: () => (live.get() ? 'flex items-center gap-2' : 'hidden') },
        kit.secondaryAction({ onClick: () => void model.decide(entry.trial, false) }, 'Undo'),
        kit.primaryAction({ onClick: () => void model.decide(entry.trial, true) }, 'Keep'),
      ),
    ),
  )
}
