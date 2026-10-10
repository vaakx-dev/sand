import type { ContextMenu, MenuSpec, NavAction, pressMenu, Sig } from '@sand/dom'
import type { Entry, ImageBlock, Notification, ToolResultBlock, UserPart } from '@sand/messages'
import type { SessionSettings } from '@sand/model/contract'
import type { RenderEntry, RenderTool, ToolRenderer, ToolView } from '@sand/transcript-chat/contract'
import type { Thread } from '@sand/web-client/contract'
import type { Dispose } from 'drydock'

export type Step = { kind: 'tool'; key: string; tool: ToolView } | { kind: 'thinking'; key: string; text: string; streaming: boolean }

export interface Report {
  key: string
  name: string
  label: string
  text: string
}

export interface ToolGroup {
  kind: 'tools'
  key: string
  steps: Step[]
  start: number
  end: number
  running: boolean
}

export type NoticeTone = 'dim' | 'error' | 'rule'

export type Item =
  | { kind: 'user'; key: string; parts: UserPart[]; steer: boolean; at: number }
  | { kind: 'notification'; key: string; notification: Notification; steer: boolean; at: number }
  | { kind: 'text'; key: string; text: string; streaming: boolean; at: number }
  | { kind: 'thinking'; key: string; text: string; streaming: boolean; at: number }
  | ToolGroup
  | { kind: 'report'; key: string; report: Report }
  | { kind: 'notice'; key: string; text: string; tone: NoticeTone }
  | { kind: 'custom'; key: string; entry: Entry }
  | { kind: 'live'; key: string }

export type DescribeSettings = (settings: SessionSettings) => string | undefined

export interface OpenState {
  open: Sig<boolean>
  toggle(): void
}

export interface OpenStates {
  get(key: string, fallback?: () => boolean): OpenState
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
  props: ReturnType<typeof pressMenu>['props']
  held(): boolean
}

export interface MenuKit {
  text(menu: ContextMenu, spec: () => MenuSpec | undefined, within?: (node: HTMLElement) => Element | null): TextMenu
  copy(id: string, label: string, text: () => string, what: string): NavAction
}

export interface ItemCache {
  items(thread: Thread, path: () => Entry[], custom: (type: string) => boolean, describe?: DescribeSettings): Item[]
  reset(): void
}

export interface TranscriptParts {
  items(thread: Thread, path: Entry[], custom: (type: string) => boolean, describe?: DescribeSettings): Item[]
  itemCache(): ItemCache
  sections(text: string): string[]
  registry(changed?: () => void): RendererRegistry
  openStates(): OpenStates
  menus: MenuKit
  toolStep(tool: Sig<ToolView>, options: ToolStepOptions): HTMLElement
  image: MediaImage
}

export interface ImageOptions {
  class?: string
  alt?: string
  title?: string
  maxHeight?: number
}

export type MediaImage = (block: ImageBlock, thread: string | undefined, options?: ImageOptions) => HTMLImageElement

export type TruncatedAt = 'before' | 'after'

export interface ToolViews {
  field(input: unknown, key: string): string
  resultText(result?: ToolResultBlock): string
  errorBody(tool: ToolView): HTMLElement
  truncatedNote(count: number, position: TruncatedAt): HTMLElement
  image: MediaImage
}

declare module 'drydock' {
  interface Services {
    transcriptParts: TranscriptParts
    toolViews: ToolViews
  }
}
