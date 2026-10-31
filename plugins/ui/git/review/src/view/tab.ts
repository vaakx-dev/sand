import type { PullRef } from '@sand/github/contract'
import { derive, div, dynamicChild, list } from '@vaakx-dev/vrui'
import type { ReviewContext } from '../inject'
import type { FilesState } from '../model/files'
import { codeState, type CodeTab } from '../model/state'
import { footer } from './footer'
import { fileSection } from './section'
import { toolbar } from './toolbar'

const inset = (child: Node) => div({ class: 'px-4' }, child)

const fileList = (tab: CodeTab) => {
  const files = derive(() => {
    const now = tab.files.state.get()
    return now.kind === 'ready' ? now.files.files : []
  })
  return list(
    files,
    file => file.path,
    file => fileSection(tab, file),
  )
}

const content = (tab: CodeTab, state: FilesState) => {
  const { kit, files } = tab
  if (state.kind === 'loading') return inset(kit.loadingState())
  if (state.kind === 'error') return inset(kit.errorState({ text: `Couldn't load the changed files: ${state.message}`, retry: files.retry }))
  if (!state.files.total) return inset(kit.emptyState({ text: 'No changed files' }))
  return fileList(tab)
}

export const codeTab = (ctx: ReviewContext, ref: PullRef) => {
  const tab = codeState(ctx, ref)
  const shown = derive(() => {
    const state = tab.files.state.get()
    return state.kind === 'ready' ? (state.files.total ? 'files' : 'empty') : state.kind
  })
  return div(
    {
      class: 'flex flex-1 flex-col',
      onMount: element => tab.layout.measure(element),
    },
    toolbar(tab),
    div(
      { class: 'flex-1' },
      dynamicChild(shown, () => content(tab, tab.files.state.get())),
    ),
    footer(tab),
  )
}
