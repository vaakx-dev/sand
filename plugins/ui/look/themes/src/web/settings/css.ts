import type { Kit } from '@sand/ui-kit/contract'
import { pageParts } from '@sand/ui-shell/contract'
import { div, p, sig, span } from '@vaakx-dev/vrui'
import { cssLimit } from '../../contract'
import type { ThemeModel } from '../model'

export const cssPage = (kit: Kit, model: ThemeModel) => {
  const draft = sig(model.saved.get()?.css ?? '')
  const changed = () => draft.get() !== (model.saved.get()?.css ?? '')
  const save = () => model.set({ ...model.saved.get(), css: draft.get() })

  return div(
    { class: 'flex flex-col gap-8' },
    kit.pageSection(
      {},
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
      { title: 'Parts you can style' },
      ...Object.entries(pageParts).map(([name, about]) =>
        kit.settingsRow({ title: span({ class: 'font-mono text-xs' }, `[data-part="${name}"]`), detail: about }),
      ),
      p({ class: 'mt-3 text-xs text-neutral-500' }, 'Colours are CSS variables like var(--vrui-color-accent-500) and var(--vrui-color-neutral-900).'),
    ),
  )
}
