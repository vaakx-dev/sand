import type { PcView } from '@sand/devices-contract'
import type { DraftTarget, Projects } from '@sand/web-client/contract'
import { pickerWords, toneOf } from '../status/words'
import type { Ui } from '../ui'

export interface PcChoice {
  view: PcView
  meta: string
  cwd?: string
  blocked?: 'offline' | 'bad' | 'missing'
}

const folderOn = (projects: Projects | undefined, draft: DraftTarget, pc: string) => {
  if (!draft.cwd || pc === draft.device) return draft.cwd
  return projects?.group(draft.cwd, draft.device)?.locations.find(copy => copy.device === pc && !copy.missing)?.path
}

export const pcChoices = (ui: Ui, views: PcView[], draft: DraftTarget | undefined, projects: Projects | undefined): PcChoice[] => {
  const project = draft ? (projects?.group(draft.cwd, draft.device)?.name ?? 'this folder') : 'this folder'
  return views.map(view => {
    const meta = view.home && view.online && view.status.phase === 'connected' && view.status.route.kind === 'local' ? 'This computer' : pickerWords(view, ui.data.nameOf, ui.device())
    const tone = toneOf(view.status)
    if (tone === 'bad') return { view, meta: `${meta} · Why?`, blocked: 'bad' }
    if (!view.online) return { view, meta, blocked: 'offline' }
    const cwd = draft && folderOn(projects, draft, view.id)
    if (draft && cwd === undefined) return { view, meta: `No copy of ${project}`, blocked: 'missing' }
    return { view, meta, ...(cwd !== undefined && { cwd }) }
  })
}
