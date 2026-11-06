import type { WireSession } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface HtmlRenderEntry {
  id: string
  title: string
  height?: number
}

export interface Artifact {
  title: string
  path: string
}

export interface LoadedPage {
  html: string
  missing: string[]
}

export type ConsoleLevel = 'log' | 'info' | 'warning' | 'error'

export interface ConsoleMessage {
  level: ConsoleLevel
  text: string
}

export interface HtmlPreview {
  png: string
  height: number
  console: ConsoleMessage[]
}

export interface HtmlPages {
  columnWidth: number
  maxHeight: number
  prepare(html: string, base: string): Promise<LoadedPage>
  load(path: string, cwd: string): Promise<LoadedPage>
  preview(html: string, width: number): Promise<HtmlPreview>
}

export const htmlPages = service<HtmlPages>('htmlPages')

export const artifactSaved = event<(conversation: Conversation, artifact: Artifact) => void>('artifact.saved')

export const htmlPage = request('html.page', { input: z.object({ session: z.string(), render: z.string() }), output: type<string>(), place: 'thread' })

export const artifactSavedWire = wireEvent<[session: WireSession, artifact: Artifact]>('artifact.saved')
