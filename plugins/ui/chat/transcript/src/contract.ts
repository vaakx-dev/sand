import type { LiveBlock } from '@sand/accounts/contract'
import type { ContextUsage } from '@sand/compaction/contract'
import type { Entry, ImageBlock, ToolCallBlock, ToolResultBlock, UserPart } from '@sand/chats/contract'
import type { ImageOptions as ShownImageOptions } from '@sand/media/web/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { ContextMenu, IconName } from '@sand/ui-kit/contract'
import type { ToolProgress } from '@sand/web-client/contract'
import type { Child, Sig } from '@vaakx-dev/vrui'
import { service, type Dispose } from 'drydock'

export type ToolStatus = 'pending' | 'running' | 'done' | 'failed'

export interface ToolView {
  call: ToolCallBlock
  result?: ToolResultBlock
  status: ToolStatus
  thread: string
  progress?: string[]
}

export type RenderTool = (tool: ToolView) => HTMLElement

export interface ToolBadge {
  text: string
  tone: 'danger' | 'neutral'
}

export interface ToolRenderer {
  icon?: string
  verb?: string
  activeVerb?: string
  label?(tool: ToolView): string
  meta?(tool: ToolView): string
  badge?(tool: ToolView): ToolBadge | undefined
  copy?(tool: ToolView): string
  body?(tool: ToolView): HTMLElement | undefined
  actions?(tool: ToolView): MenuAction[]
}

export type RenderEntry = (entry: Entry, conversation: string) => HTMLElement | undefined

export interface NoticeKind {
  icon?: IconName
  actions?(text: string, conversation: string): Child
}

export interface Transcript {
  tool(name: string, render: RenderTool | ToolRenderer): Dispose
  entry(type: string, render: RenderEntry): Dispose
  ending(stopReason: string, render: RenderEntry): Dispose
  notice(from: string, kind: NoticeKind): Dispose
}

export type Step = { kind: 'tool'; key: string; tool: ToolView } | { kind: 'thinking'; key: string; text: string; streaming: boolean }

export interface ToolGroup {
  kind: 'tools'
  key: string
  steps: Step[]
  start: number
  end: number
  running: boolean
}

export type NoticeTone = 'dim' | 'error' | 'rule'

export type Item = (
  | { kind: 'user'; key: string; parts: UserPart[]; steer: boolean; at: number }
  | { kind: 'text'; key: string; text: string; streaming: boolean; at: number }
  | { kind: 'thinking'; key: string; text: string; streaming: boolean; at: number }
  | ToolGroup
  | { kind: 'notice'; key: string; text: string; tone: NoticeTone }
  | { kind: 'custom'; key: string; entry: Entry }
  | { kind: 'live'; key: string }
) & { opens?: string }

export interface Settled {
  items: Item[]
  group: ToolGroup | undefined
  last: number
  head: string | undefined
}

export interface Source {
  id: string
  live: LiveBlock[]
  running: boolean
  tools?: ToolProgress
  context?: ContextUsage
}

export type Owner = Pick<Source, 'id' | 'tools'>

export interface OpenState {
  open: Sig<boolean>
  toggle(): void
}

export interface OpenStates {
  get(key: string): OpenState
}

export interface RendererRegistry {
  readonly version: Sig<number>
  tool(name: string, render: RenderTool | ToolRenderer): Dispose
  entry(type: string, render: RenderEntry): Dispose
  ending(stopReason: string, render: RenderEntry): Dispose
  notice(from: string, kind: NoticeKind): Dispose
  toolRenderer(name: string): Required<ToolRenderer>
  entryRenderer(type: string): RenderEntry | undefined
  noticeKind(from: string): NoticeKind | undefined
}

export type FileOpener = () => ((path: string) => void) | undefined

export interface ToolStepOptions {
  renderer: (name: string) => Required<ToolRenderer>
  fileOpener?: FileOpener
  version: Sig<number>
  open: Sig<boolean>
  toggle(): void
  menu?: ContextMenu
}

export interface Place {
  railed: boolean
  last: boolean
}

export interface Row<T = unknown> {
  key: string
  data: T
  view(data: Sig<T>, place?: Sig<Place>): HTMLElement
}

export type UserItem = Extract<Item, { kind: 'user' }>

export interface Surface {
  conversation: string
  cwd?: string
  menu: ContextMenu
  states: OpenStates
  jump(from: Element, quote: string): void
  reply?(text: string): MenuAction[]
  rewrite?(entry: string, text: string): MenuAction[]
  branchSwitch?(entry: string): Child
}

export interface Rows {
  item(item: Item): Row[]
  user(item: UserItem, actions: (text: string) => MenuAction[], note?: () => Child): Row
}

export interface TranscriptParts {
  version: Sig<number>
  settled(owner: Owner, path: Entry[]): Settled
  items(settled: Settled, source: Source): Item[]
  prompt(entry: Entry, parts: UserPart[]): Item[]
  rows(surface: Surface): Rows
  openStates(): OpenStates
  quoteJump(owner: Node): (root: Element, from: Element, quote: string) => void
}

export type ImageOptions = Omit<ShownImageOptions, 'open'>

export type MediaImage = (block: ImageBlock, thread: string | undefined, options?: ImageOptions) => HTMLElement

export type TruncatedAt = 'before' | 'after'

export interface ToolViews {
  field(input: unknown, key: string): string
  resultText(result?: ToolResultBlock): string
  errorBody(tool: ToolView): HTMLElement
  outputText(text: Child, error: boolean): HTMLElement
  truncatedNote(count: number, position: TruncatedAt): HTMLElement
  image: MediaImage
}

export const transcript = service<Transcript>('transcript')
export const toolViews = service<ToolViews>('toolViews')
export const transcriptParts = service<TranscriptParts>('transcriptParts')
