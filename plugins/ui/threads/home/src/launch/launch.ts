import { palette } from '@sand/palette/contract'
import { chosen } from '../integrations/chosen'
import { projectPage } from '../palette/projects'
import { moveDraft, startChat, type StartParts } from './start'

const lastPlace = ({ projects, threads }: StartParts) => {
  const last = chosen.get()
  const device = last?.device ?? threads.device()
  const path = last?.path ?? ''
  const kept = path && projects.groups().some(group => group.locations.some(location => location.device === device && location.path === path && !location.missing))
  return { path: kept ? path : '', device }
}

export const newThread = (parts: StartParts) => {
  const { path, device } = lastPlace(parts)
  startChat(parts)(path, device)
}

export const chooseDraftPlace = (parts: StartParts, draft: string) => parts.ctx.get(palette)?.open(projectPage(parts, moveDraft(parts, draft)))
