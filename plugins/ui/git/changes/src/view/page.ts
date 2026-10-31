import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, list, resizeObserver, type Child } from '@vaakx-dev/vrui'
import type { ChangesModel } from '../model/model'
import type { Phase } from '../model/phase'
import { fileList } from './file-list'
import { viewLayout } from './layout'
import type { ChangesServices, ViewParts } from './parts'
import { quoteBar } from './quote-bar'
import { fileSection } from './section'
import { sectionIndex } from './sections'
import { toolbar } from './toolbar'

const inset = (child: Child) => div({ class: 'px-2' }, child)

const readyView = (parts: ViewParts) =>
  div(
    fileList(parts),
    list(
      parts.model.files,
      file => file.path,
      (file, index) => fileSection(parts, file, index.get()),
    ),
  )

const content = (parts: ViewParts, phase: Phase) => {
  const { kit, model } = parts
  if (phase === 'ready') return readyView(parts)
  if (phase === 'no-folder') return inset(kit.emptyState({ text: 'This thread has no folder.' }))
  if (phase === 'no-repo') return inset(kit.emptyState({ text: 'Not a git repo' }))
  if (phase === 'empty') return inset(kit.emptyState({ text: 'No changes' }))
  if (phase === 'error') {
    const message = () => {
      const state = model.list.get()
      return state.kind === 'error' ? `Couldn't load the changes: ${state.message}` : ''
    }
    return inset(kit.errorState({ text: message, retry: model.reload }))
  }
  return inset(kit.loadingState())
}

export const changesPage = (kit: Kit, model: ChangesModel, services: ChangesServices) => {
  const parts: ViewParts = { ...services, kit, model, layout: viewLayout(), sections: sectionIndex() }
  return div(
    { class: 'absolute inset-0' },
    div(
      {
        'data-changes-scroll': 'true',
        class: 'absolute inset-0 overflow-auto bg-neutral-950',
        onMount: element => {
          resizeObserver(element, entries => parts.layout.width.set(entries[0]?.contentRect.width ?? 0))
        },
      },
      toolbar(parts),
      dynamicChild(model.phase, phase => content(parts, phase)),
    ),
    quoteBar(parts),
  )
}
