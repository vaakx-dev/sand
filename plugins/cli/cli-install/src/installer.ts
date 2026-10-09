import type { Daemon } from '@sand/protocol'

export interface Installer {
  home: string
  daemon: Daemon
  open(): Promise<unknown>
}
