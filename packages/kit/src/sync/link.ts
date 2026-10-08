import type { ProjectList, ProjectRef } from '@sand/protocol'
import { uuid } from '../ids/uuid'
import type { SyncCall } from './call'

export const linkProjects = async (call: SyncCall, from: ProjectRef, to: ProjectRef) => {
  const list = await call<ProjectList>({ type: 'projects.list' }, from.device)
  const link = list.projects.find(project => project.path === from.path)?.link ?? uuid()
  await call({ type: 'projects.update', path: from.path, patch: { link } }, from.device)
  await call({ type: 'projects.add', path: to.path, link }, to.device)
  return link
}
