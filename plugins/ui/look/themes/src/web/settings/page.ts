import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { ThemeModel } from '../model'

export interface PageLinks {
  css(): void
}

const modeChoices = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
]

const lineCount = (css: string | undefined) => (css?.trim() ? css.trim().split('\n').length : 0)

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const themePage = (kit: Kit, model: ThemeModel, links: PageLinks) => {
  const current = model.saved
  const cssLines = () => lineCount(current.get()?.css)

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      {},
      kit.settingsRow(
        { title: 'Appearance', detail: 'System follows your device as it switches between light and dark' },
        kit.segmented(modeChoices, () => current.get()?.mode ?? 'system', mode => model.set({ ...current.get(), mode }), { label: 'Appearance' }),
      ),
      kit.settingsRow({ title: 'Custom CSS', detail: () => (cssLines() ? plural(cssLines(), 'line', 'lines') : 'None'), onOpen: links.css }),
    ),
    kit.pageSection(
      {},
      kit.settingsRow(
        { title: 'Reset to sand’s look', detail: span('Clears custom colours, backgrounds and CSS and follows the system. If a theme ever hides the page, open sand with ', span({ class: 'whitespace-nowrap font-mono text-neutral-400' }, '?theme=off'), '.') },
        kit.secondaryAction({ onClick: () => model.reset(), disabled: () => !current.get() }, 'Reset'),
      ),
    ),
  )
}
