import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { ThemeModel } from '../model'

export interface PageLinks {
  css(): void
}

const modeChoices = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
]

export const themePage = (kit: Kit, model: ThemeModel, links: PageLinks) => {
  const current = model.saved

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      {},
      kit.settingsRow(
        { title: 'Appearance' },
        kit.segmented(modeChoices, () => current.get()?.mode ?? 'system', mode => model.set({ ...current.get(), mode }), { label: 'Appearance' }),
      ),
      kit.settingsRow({ title: 'Custom CSS', onOpen: links.css }),
    ),
    kit.pageSection({}, kit.settingsRow({ title: 'Reset' }, kit.secondaryAction({ onClick: () => model.reset(), disabled: () => !current.get() }, 'Reset'))),
  )
}
