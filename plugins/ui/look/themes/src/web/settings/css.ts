import type { Kit } from '@sand/ui-kit/contract'
import { pageParts } from '@sand/ui-shell/contract'
import { div, p, sig, span } from '@vaakx-dev/vrui'
import { cssLimit, type Theme } from '../../contract'
import type { ThemeModel } from '../model'

const sandLook: Theme = { name: 'Custom', base: '#0b0b0c', accent: '#e5e5e5' }

export const cssPage = (kit: Kit, model: ThemeModel) => {
  const draft = sig(model.saved.get()?.css ?? '')
  const changed = () => draft.get() !== (model.saved.get()?.css ?? '')
  const save = () => model.set({ ...(model.saved.get() ?? sandLook), css: draft.get() })

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      { note: 'Styles the whole page on every device. CSS that would load anything from the internet is left out.' },
      kit.textArea({
        rows: 14,
        bindValue: draft,
        maxLength: cssLimit,
        spellcheck: false,
        'aria-label': 'Custom CSS',
        placeholder: '[data-part="composer"] {\n  border-radius: 8px;\n}',
        class: 'font-mono text-xs md:text-xs',
      }),
      div(
        { class: 'mt-3 flex justify-end gap-2' },
        kit.secondaryAction({ disabled: () => !changed(), onClick: () => draft.set(model.saved.get()?.css ?? '') }, 'Discard'),
        kit.primaryAction({ disabled: () => !changed(), onClick: save }, 'Save'),
      ),
    ),
    kit.pageSection(
      { title: 'Parts you can style', note: 'These names stay the same across updates.' },
      ...Object.entries(pageParts).map(([name, about]) =>
        kit.settingsRow({ title: span({ class: 'font-mono text-xs' }, `[data-part="${name}"]`), detail: about }),
      ),
      p({ class: 'mt-3 text-xs text-neutral-500' }, 'Colours are CSS variables like var(--vrui-color-accent-500) and var(--vrui-color-neutral-900).'),
    ),
  )
}
