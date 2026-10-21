import { stored } from '@vaakx-dev/vrui'

export const projectFilter = () => {
  const project = stored('sand.sidebar.project', '')
  return { project, set: (next: string | undefined) => project.set(next ?? '') }
}
