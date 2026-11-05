import type { Dispose } from 'drydock'
import type { Entry } from './entry'
import type { Message } from './message'

export interface ViewReset {
  keep: string | null
  thread?: string
}

export interface EntryView {
  type: string
  message(entry: Entry, path: Entry[]): Message | undefined
  resets?(entry: Entry): ViewReset
}

export interface EntryViews {
  register(view: EntryView): Dispose
  get(type: string): EntryView | undefined
}
