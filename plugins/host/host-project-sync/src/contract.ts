import type { Project } from '@sand/host-projects/contract'

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'projects.sync': { projects: Project[] }
  }
}
