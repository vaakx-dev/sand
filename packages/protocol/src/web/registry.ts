import type { Hello, WireEvent } from '../wire'
import type { Commands } from './commands'
import type { Composer } from './composer'
import type { FileIndex, Jobs, LimitsFeed, Models, SkillIndex } from './data'
import type { Drafts } from './drafts'
import type { Extensions } from './extensions'
import type { Keys } from './keys'
import type { Layout, LayoutState } from './layout'
import type { Machines } from './machines'
import type { Nav } from './nav'
import type { Notify } from './notify'
import type { Palette } from './palette'
import type { Panels } from './panels'
import type { Picker } from './picker'
import type { Projects } from './projects'
import type { Settings } from './settings'
import type { Sync, SyncFlows } from './sync'
import type { Threads } from './threads'
import type { Transcript } from './transcript'
import type { Turns } from './turns'
import type { Wire, WireState } from './wire'

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
    extensions: Extensions
    layout: Layout
    nav: Nav
    transcript: Transcript
    composer: Composer
    drafts: Drafts
    commands: Commands
    keys: Keys
    panels: Panels
    notify: Notify
    palette: Palette
    picker: Picker
    projects: Projects
    machines: Machines
    settings: Settings
    sync: Sync
    syncFlows: SyncFlows
  }

  interface Events {
    'wire.state': (state: WireState) => void
    'wire.hello': (hello: Hello) => void
    'wire.event': (event: WireEvent) => void
    'threads.change': () => void
    'thread.change': (id: string) => void
    'thread.select': (id: string | undefined) => void
    'drafts.change': () => void
    'jobs.change': () => void
    'models.change': () => void
    'limits.change': () => void
    'skills.change': () => void
    'commands.change': () => void
    'layout.change': (state: LayoutState) => void
    'settings.change': (page: string | undefined) => void
    'extensions.change': () => void
    'panels.change': (current: string | undefined) => void
    'projects.change': () => void
    'machines.change': () => void
    'sync.change': () => void
  }
}
