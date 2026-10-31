import type { Entry, ImageBlock, ToolCallBlock, ToolResultBlock, UserPart } from '@sand/chats/contract'
import type { MarkdownImage } from '@sand/markdown/contract'
import type { ImageOptions as ShownImageOptions } from '@sand/media/web/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { NavAction } from '@sand/nav/contract'
import type { ContextMenu, Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { Thread } from '@sand/web-client/contract'
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
  actions?(tool: ToolView): NavAction[]
}

export type RenderEntry = (entry: Entry, thread: string) => HTMLElement | undefined

export interface TurnInfo {
  session: string
  device: string
  startEntry: string
  running: boolean
}

export interface TurnFooter {
  id: string
  order?: number
  view(turn: TurnInfo): Child | null
}

export interface Transcript {
  tool(name: string, render: RenderTool | ToolRenderer): Dispose
  entry(type: string, render: RenderEntry): Dispose
  turnFooter(footer: TurnFooter): Dispose
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

export type DescribeSettings = (settings: SessionSettings) => string | undefined

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
  toolRenderer(name: string): Required<ToolRenderer>
  entryRenderer(type: string): RenderEntry | undefined
}

export interface ToolStepOptions {
  renderer: (name: string) => Required<ToolRenderer>
  version: Sig<number>
  open: Sig<boolean>
  toggle(): void
  menu?: ContextMenu
}

export interface TextMenu {
  props: ReturnType<Kit['pressMenu']>['props']
  held(): boolean
}

export interface MenuKit {
  text(menu: ContextMenu, spec: () => MenuSpec | undefined): TextMenu
  more(menu: ContextMenu, spec: () => MenuSpec | undefined): HTMLElement
}

export interface ItemCache {
  items(thread: Thread, path: () => Entry[], custom: (type: string) => boolean, describe: DescribeSettings): Item[]
  reset(): void
}

export interface TranscriptParts {
  items(thread: Thread, path: Entry[], custom: (type: string) => boolean, describe: DescribeSettings): Item[]
  itemCache(): ItemCache
  sections(text: string): string[]
  registry(changed: () => void): RendererRegistry
  openStates(): OpenStates
  menus: MenuKit
  toolStep(tool: Sig<ToolView>, options: ToolStepOptions): HTMLElement
  image: MediaImage
  replyImage(thread: string): MarkdownImage
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
