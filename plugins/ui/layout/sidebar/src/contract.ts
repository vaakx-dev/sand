import type { Child } from '@vaakx-dev/vrui'
import { service, type Dispose } from 'drydock'

export interface SidebarThread {
  id: string
  cwd: string
  device: string
  project: string
  running: boolean
  draft: boolean
}

export interface RowDecoration {
  id: string
  order?: number
  meta?(thread: SidebarThread): Child | null
  mark?(thread: SidebarThread): Child | null
}

export interface Sidebar {
  decorate(decoration: RowDecoration): Dispose
}

export const sidebar = service<Sidebar>('sidebar')
