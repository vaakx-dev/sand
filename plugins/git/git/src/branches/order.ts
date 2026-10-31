import type { GitBranch } from '../contract'

const fullName = (branch: GitBranch) => (branch.remote ? `${branch.remote}/${branch.name}` : branch.name)

export const matches = (branch: GitBranch, query: string) => !query || fullName(branch).toLowerCase().includes(query.trim().toLowerCase())

const weight = (branch: GitBranch) => (branch.current ? 0 : branch.isDefault ? (branch.remote ? 2 : 1) : 3)

export const rank = (a: GitBranch, b: GitBranch) => weight(a) - weight(b) || b.updated - a.updated || fullName(a).localeCompare(fullName(b))
