import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, span } from '@vaakx-dev/vrui'
import type { Theme } from '../../contract'
import type { ThemeModel } from '../model'
import { type Appearance, appearancePreview } from './preview'

export interface PageLinks {
  css(): void
}

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const lineCount = (css: string | undefined) => (css?.trim() ? css.trim().split('\n').length : 0)

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

const appearanceOf = (theme: Theme | null): Appearance => theme?.mode ?? 'system'

const atDefault = (key: string, value: unknown) => value === undefined || (key === 'mode' && value === 'system') || (key === 'css' && !String(value).trim())

const customised = (theme: Theme | null) => Object.entries(theme ?? {}).some(([key, value]) => !atDefault(key, value))

export const themePage = (kit: Kit, model: ThemeModel, links: PageLinks) => {
  const current = model.saved
  const appearance = derive(() => appearanceOf(current.get()))
  const choose = (mode: Appearance) => model.set({ ...current.get(), mode })
  const cssLines = () => lineCount(current.get()?.css)

  const tile = ({ value, label }: (typeof APPEARANCES)[number]) => {
    const on = () => appearance.get() === value
    return kit.plainButton(
      { class: 'group flex min-w-0 flex-col gap-2 text-left', role: 'radio', 'aria-checked': () => String(on()), onClick: () => choose(value) },
      div({ class: () => ['overflow-hidden rounded-lg transition-shadow', on() ? 'ring-2 ring-accent-500' : 'ring-1 ring-neutral-700 group-hover:ring-neutral-600'] }, appearancePreview(value)),
      div(
        { class: 'flex min-w-0 items-center gap-1.5' },
        span({ class: () => ['min-w-0 truncate text-sm', on() ? 'font-medium text-neutral-100' : 'text-neutral-400'] }, label),
        span({ class: () => (on() ? 'ml-auto inline-flex text-accent-400' : 'hidden') }, kit.icon('check', 'xs')),
      ),
    )
  }

  const undo = kit.iconButton(
    { size: 'sm', 'aria-label': 'Use System', title: 'Use System', class: () => (appearance.get() === 'system' ? 'hidden' : ''), onClick: () => choose('system') },
    kit.icon('retry', 'sm'),
  )

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection({ title: 'Appearance', action: undo }, div({ class: 'grid grid-cols-3 gap-x-2 sm:gap-x-3', role: 'radiogroup', 'aria-label': 'Appearance' }, ...APPEARANCES.map(tile))),
    kit.pageSection({}, kit.settingsRow({ title: 'Custom CSS', detail: () => (cssLines() ? plural(cssLines(), 'line', 'lines') : 'None'), onOpen: links.css })),
    div(
      { class: () => (customised(current.get()) ? '' : 'hidden') },
      kit.pageSection({}, kit.settingsRow({ title: 'Reset theme' }, kit.secondaryAction({ onClick: () => model.reset() }, 'Reset'))),
    ),
  )
}
