import type { NoticeLevel, ReportRow } from '../ui'

export interface NotifyAction {
  label: string
  run(): void
}

export interface NotifyOptions {
  level?: NoticeLevel
  action?: NotifyAction
  timeout?: number
}

export interface Notify {
  push(text: string, options?: NotifyOptions): void
  report(title: string, rows: ReportRow[]): void
}
