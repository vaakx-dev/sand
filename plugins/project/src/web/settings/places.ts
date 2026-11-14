import type { ProjectEntry } from '@sand/web-client/contract'

export const byRecent = (locations: ProjectEntry[]) => [...locations].sort((a, b) => b.updated - a.updated)
