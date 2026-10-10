import type { Hello, WireEvent } from '@sand/protocol'
import type { FileIndex, Jobs, LimitsFeed, Models, SkillIndex } from './data'
import type { Machines } from './machines'
import type { Media } from './media'
import type { Projects } from './projects'
import type { Threads } from './threads'
import type { Turns } from './turns'
import type { Wire, WireState } from './wire'

export type * from './data'
export type * from './machines'
export type * from './media'
export type * from './projects'
export type * from './threads'
export type * from './turns'
export type * from './wire'

declare module 'drydock' {
  interface Services {
    wire: Wire
    threads: Threads
    turns: Turns
    jobs: Jobs
    models: Models
    limits: LimitsFeed
    fileIndex: FileIndex
    skillIndex: SkillIndex
    projects: Projects
    machines: Machines
    media: Media
  }

  interface Events {
    'wire.state': (state: WireState) => void
    'wire.hello': (hello: Hello) => void
    'wire.event': (event: WireEvent) => void
    'threads.change': () => void
    'thread.change': (id: string) => void
    'thread.select': (id: string | undefined) => void
    'jobs.change': () => void
    'models.change': () => void
    'limits.change': () => void
    'skills.change': () => void
    'projects.change': () => void
    'machines.change': () => void
    'machines.event': (device: string, event: WireEvent) => void
  }
}
