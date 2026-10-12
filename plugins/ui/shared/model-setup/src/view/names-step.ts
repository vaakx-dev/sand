import type { Models } from '@sand/web-client/contract'
import type { Pulse } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { ModelSetupState } from '../setup'
import { problem, screen } from './layout'
import { choiceRow, modelList } from './models'

const sameAsThreads = (kit: Kit, setup: ModelSetupState, models: Models, id: string) => {
  const { modelLogo, settingsSection } = kit
  const model = models.info(id)
  return settingsSection(
    {},
    choiceRow(
      kit,
      setup.namer,
      id,
      span({ class: 'flex-1 text-sm font-medium text-neutral-100' }, 'Same as new threads'),
      span({ class: 'flex shrink-0 items-center gap-2 text-sm text-neutral-400' }, modelLogo(model?.provider, 14), model?.label ?? id),
    ),
  )
}

export const namesStep = (kit: Kit, setup: ModelSetupState, models: Models, changes: Pulse) => {
  const { primaryAction, quietButton, setupColumn, setupFooter, setupHeading, setupNote } = kit
  const threads = setup.model.get()
  return screen(
    kit,
    3,
    setupHeading('Pick a model to name threads'),
    setupNote('It writes thread and branch names. A small, fast model is enough.'),
    setupColumn(
      modelList(kit, models, changes, setup.namer, {
        label: 'Model that names threads',
        left: threads,
        ...(threads && { lead: () => sameAsThreads(kit, setup, models, threads) }),
      }),
      problem(kit, () => setup.error.get()),
    ),
    setupFooter(
      quietButton({ disabled: setup.busy, onClick: setup.namesOff }, "Don't name threads"),
      div(
        { class: 'flex items-center gap-2' },
        quietButton({ disabled: setup.busy, onClick: setup.skipNamer }, 'Skip'),
        primaryAction({ disabled: () => setup.busy.get() || !setup.namer.get(), onClick: setup.saveNamer }, 'Done'),
      ),
    ),
  )
}
