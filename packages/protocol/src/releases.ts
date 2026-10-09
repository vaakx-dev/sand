import type { BuildInfo } from './remotes'

export type UpdateChannel = 'release' | 'nightly'

export interface ReleaseInfo {
  channel: UpdateChannel
  tag: string
  name: string
  publishedAt: number
  notesUrl: string
  build: BuildInfo
}
