import type { ProjectLook } from '@sand/project/contract'

export type ItemState = 'idle' | 'running' | 'background' | 'draft'

export interface ThreadItem {
  id: string
  title: string
  projectKey: string
  project: string
  icon?: ProjectLook
  subtitle?: string
  pcMark?: () => HTMLElement
  path?: string
  device: string
  updated: number
  started?: number
  state: ItemState
  agents?: number
  unread?: boolean
  pinned?: boolean
  settled?: boolean
  snoozed?: number
  back?: boolean
  movable?: boolean
}
