import type { ProjectFiles } from '@sand/project-files/contract'
import type { Server } from '@sand/server/contract'
import { iconRoute, iconVersion } from './icon'

export const serveIcons = (server: Server, files: ProjectFiles) => {
  const disposers = [
    server.handle('projects.icon', ({ project }) => iconVersion(files, project)),
    server.route('/project-icon', iconRoute(files)),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
