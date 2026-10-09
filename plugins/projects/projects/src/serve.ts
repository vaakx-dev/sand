import type { Server } from '@sand/protocol'
import { iconRoute, iconVersion } from './icon'

export const serveIcons = (server: Server, home: string) => {
  const disposers = [
    server.handle('projects.icon', ({ project }) => iconVersion(home, project)),
    server.route('/project-icon', iconRoute(home)),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
