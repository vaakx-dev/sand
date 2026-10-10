import { joinDisposers } from '@sand/kit'
import type { ProjectFiles } from '@sand/project-files/contract'
import type { Server } from '@sand/server/contract'
import { iconRoute, iconVersion } from './icon'

export const serveIcons = (server: Server, files: ProjectFiles) =>
  joinDisposers(
    server.handle('projects.icon', ({ project }) => iconVersion(files, project)),
    server.route('/project-icon', iconRoute(files)),
  )
