import type { Entry, ToolCallBlock, ToolResultBlock } from '@sand/messages'
import type { NavAction } from '@sand/dom'
import type { Dispose } from 'drydock'

export type ToolStatus = 'pending' | 'running' | 'done' | 'failed'

export interface ToolView {
  call: ToolCallBlock
  result?: ToolResultBlock
  status: ToolStatus
  thread: string
}

export type RenderTool = (tool: ToolView) => HTMLElement

export interface ToolBadge {
  text: string
  tone: 'success' | 'danger' | 'neutral'
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

export interface Transcript {
  tool(name: string, render: RenderTool | ToolRenderer): Dispose
  entry(type: string, render: RenderEntry): Dispose
  scrollToEnd(): void
}

declare module 'drydock' {
  interface Services {
    transcript: Transcript
  }
}
